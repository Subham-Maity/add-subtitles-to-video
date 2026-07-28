import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { SubtitleService } from '../service';
import { CreateCueDto, UpdateCueDto, RegenerateCuesDto, UpdateStyleDto } from '../dto';

@Controller('videos')
export class SubtitlesController {
  constructor(private readonly subtitleService: SubtitleService) {}

  @Post(':id/cues')
  async createCue(
    @Param('id') id: string,
    @Body() dto: CreateCueDto,
  ) {
    return this.subtitleService.createCue(id, dto);
  }

  @Patch(':id/cues/:cueId')
  async updateCue(
    @Param('cueId') cueId: string,
    @Body() dto: UpdateCueDto,
  ) {
    return this.subtitleService.updateCue(cueId, dto);
  }

  @Delete(':id/cues/:cueId')
  async deleteCue(
    @Param('cueId') cueId: string,
  ) {
    return this.subtitleService.deleteCue(cueId);
  }

  @Post(':id/cues/regenerate')
  async regenerateCues(
    @Param('id') id: string,
    @Body() dto: RegenerateCuesDto,
  ) {
    return this.subtitleService.regenerateCues(id, dto.wordsPerCue);
  }

  @Patch(':id/style')
  async updateStyle(
    @Param('id') id: string,
    @Body() dto: UpdateStyleDto,
  ) {
    return this.subtitleService.updateStyle(id, dto);
  }
}
