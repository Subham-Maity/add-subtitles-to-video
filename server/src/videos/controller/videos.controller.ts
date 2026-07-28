import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Sse,
  MessageEvent,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';
import { Response } from 'express';
import { VideoProjectRepository } from 'src/videos/repository';
import { VideoPipelineOrchestrator } from 'src/videos/service';
import { FfprobeHelper } from 'src/videos/service/core/utility';

@Controller('videos')
export class VideosController {
  private readonly storageDir: string;

  constructor(
    private readonly videoRepo: VideoProjectRepository,
    private readonly orchestrator: VideoPipelineOrchestrator,
    private readonly ffprobe: FfprobeHelper,
    config: ConfigService,
  ) {
    this.storageDir = path.resolve(
      config.get<string>('STORAGE_DIR', '../storage'),
    );
  }

  @Post('storage/clean-junk')
  async cleanStorageJunk() {
    let totalFreedBytes = 0;
    let deletedFilesCount = 0;

    const projects = await this.videoRepo.findAll();
    const activeProjectIds = new Set(projects.map((p) => p.id));
    const activeStoragePaths = new Set(projects.map((p) => path.resolve(p.storagePath)));

    // Helper to safely delete file & track size
    const deleteFileTrack = (filePath: string) => {
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            totalFreedBytes += stat.size;
            fs.unlinkSync(filePath);
            deletedFilesCount++;
          }
        }
      } catch (e) {}
    };

    // Helper to safely delete folder & track size
    const deleteFolderTrack = (folderPath: string) => {
      try {
        if (fs.existsSync(folderPath)) {
          const getDirSize = (p: string): number => {
            let size = 0;
            const entries = fs.readdirSync(p, { withFileTypes: true });
            for (const entry of entries) {
              const full = path.join(p, entry.name);
              if (entry.isDirectory()) size += getDirSize(full);
              else size += fs.statSync(full).size;
            }
            return size;
          };
          totalFreedBytes += getDirSize(folderPath);
          fs.rmSync(folderPath, { recursive: true, force: true });
          deletedFilesCount++;
        }
      } catch (e) {}
    };

    // 1. Purge temp directory completely
    const tempDir = path.join(this.storageDir, 'temp');
    if (fs.existsSync(tempDir)) {
      try {
        const files = fs.readdirSync(tempDir);
        for (const f of files) {
          deleteFileTrack(path.join(tempDir, f));
        }
      } catch (e) {}
    }

    // 2. Clean export directories (both orphan folders & old render files inside active folders)
    const exportsDir = path.join(this.storageDir, 'exports');
    if (fs.existsSync(exportsDir)) {
      try {
        const dirs = fs.readdirSync(exportsDir);
        for (const dirName of dirs) {
          const exportFolderPath = path.join(exportsDir, dirName);
          if (!activeProjectIds.has(dirName)) {
            // Delete entire orphan export folder
            deleteFolderTrack(exportFolderPath);
          } else {
            // Active project export folder: delete temporary .ass files & old rendered videos
            try {
              const exportFiles = fs.readdirSync(exportFolderPath);
              // Find the newest export file if any
              let newestFile: { name: string; mtime: number } | null = null;
              for (const ef of exportFiles) {
                const fullEfPath = path.join(exportFolderPath, ef);
                const stat = fs.statSync(fullEfPath);
                if (ef.endsWith('.ass')) {
                  deleteFileTrack(fullEfPath);
                } else if (stat.isFile() && (ef.endsWith('.mp4') || ef.endsWith('.mov'))) {
                  if (!newestFile || stat.mtimeMs > newestFile.mtime) {
                    newestFile = { name: ef, mtime: stat.mtimeMs };
                  }
                }
              }

              // Delete all older export files except the latest one (if present)
              for (const ef of exportFiles) {
                if (ef.endsWith('.ass')) continue;
                const fullEfPath = path.join(exportFolderPath, ef);
                const stat = fs.statSync(fullEfPath);
                if (stat.isFile() && (ef.endsWith('.mp4') || ef.endsWith('.mov'))) {
                  if (!newestFile || ef !== newestFile.name) {
                    deleteFileTrack(fullEfPath);
                  }
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    // 3. Clean temporary audio.wav extracts inside uploads & standalone audio folder
    const audioDir = path.join(this.storageDir, 'audio');
    if (fs.existsSync(audioDir)) {
      try {
        const files = fs.readdirSync(audioDir);
        for (const f of files) {
          deleteFileTrack(path.join(audioDir, f));
        }
      } catch (e) {}
    }

    // Clean audio.wav & orphan files in uploads directory
    const uploadsDir = path.join(this.storageDir, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      try {
        const uploadFolders = fs.readdirSync(uploadsDir);
        for (const uf of uploadFolders) {
          const folderPath = path.join(uploadsDir, uf);
          if (fs.statSync(folderPath).isDirectory()) {
            const files = fs.readdirSync(folderPath);
            let hasOriginal = false;
            for (const f of files) {
              const fullF = path.join(folderPath, f);
              if (f.startsWith('audio') || f.endsWith('.wav')) {
                // Delete temporary extracted audio
                deleteFileTrack(fullF);
              } else if (activeStoragePaths.has(path.resolve(fullF))) {
                hasOriginal = true;
              }
            }
            // If upload folder has no active original video project, delete folder
            if (!hasOriginal) {
              deleteFolderTrack(folderPath);
            }
          }
        }
      } catch (e) {}
    }

    const freedMb = parseFloat((totalFreedBytes / (1024 * 1024)).toFixed(2));
    return {
      success: true,
      freedMb,
      deletedFilesCount,
      message: `Cleaned ${freedMb} MB of storage junk (${deletedFilesCount} temporary files removed)`,
    };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tempDir = path.join(process.cwd(), '../storage/temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadVideo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No video file uploaded');

    const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const targetFolder = path.join(this.storageDir, 'uploads', videoId);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });

    const finalPath = path.join(targetFolder, `original${path.extname(file.originalname)}`);
    fs.renameSync(file.path, finalPath);

    const metadata = await this.ffprobe.extractMetadata(finalPath);

    const project = await this.videoRepo.create({
      originalFilename: file.originalname,
      storagePath: finalPath,
      durationMs: metadata.durationMs,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
    });

    // Start background processing pipeline
    this.orchestrator.runPipeline(project.id).catch(() => {});

    return project;
  }

  @Get()
  async listProjects() {
    return this.videoRepo.findAll();
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    const project = await this.videoRepo.findById(id);
    if (!project) throw new NotFoundException('Video project not found');
    return project;
  }

  @Get(':id/stream')
  async streamVideo(@Param('id') id: string, @Res() res: Response) {
    const project = await this.videoRepo.findById(id);
    if (!project || !fs.existsSync(project.storagePath)) {
      throw new NotFoundException('Video file not found');
    }
    return res.sendFile(path.resolve(project.storagePath));
  }

  @Delete(':id')
  async deleteProject(@Param('id') id: string) {
    const project = await this.videoRepo.findById(id);
    if (!project) throw new NotFoundException('Video project not found');

    // Remove file directories
    const uploadFolder = path.dirname(project.storagePath);
    if (fs.existsSync(uploadFolder)) {
      fs.rmSync(uploadFolder, { recursive: true, force: true });
    }

    const exportFolder = path.join(this.storageDir, 'exports', id);
    if (fs.existsSync(exportFolder)) {
      fs.rmSync(exportFolder, { recursive: true, force: true });
    }

    await this.videoRepo.delete(id);
    return { message: 'Video project deleted successfully', id };
  }

  @Post(':id/retry')
  async retryPipeline(@Param('id') id: string) {
    const project = await this.videoRepo.findById(id);
    if (!project) throw new NotFoundException('Video project not found');

    // Trigger background pipeline execution
    this.orchestrator.runPipeline(id).catch(() => {});

    return { message: 'Pipeline retry initiated', id };
  }

  @Sse(':id/progress')
  sseProgress(@Param('id') id: string): Observable<MessageEvent> {
    return this.orchestrator.getEventStream(id).pipe(
      map((event) => ({
        data: event,
      })),
    );
  }
}
