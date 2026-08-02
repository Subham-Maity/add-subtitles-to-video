import { forwardRef, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullConfig, RedisConnectionChecker } from './bull/config';
import {
  BullService,
  SubtitleTranscriptionQueueService,
} from './bull/service';
import { SubtitleTranscriptionProcessor } from './bull/processors';
import { SUBTITLE_TRANSCRIPTION_QUEUES } from './bull/constant';
import { PrismaModule } from '../prisma';
import { VideosModule } from '../videos/videos.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => VideosModule), // SubtitleTranscriptionProcessor injects VideoPipelineOrchestrator

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const bullConfig = new BullConfig(configService);
        return bullConfig.getBullMQConfig();
      },
    }),

    BullModule.registerQueue(
      // Infrastructure queues
      { name: 'default' },
      { name: 'failed' },

      // Subtitle & transcription processing queue
      {
        name: SUBTITLE_TRANSCRIPTION_QUEUES.TRANSCRIPTION,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ),
  ],

  providers: [
    BullConfig,
    RedisConnectionChecker,
    BullService,
    SubtitleTranscriptionQueueService,
    // ✅ Processors MUST be in providers — NestJS won't detect them otherwise
    SubtitleTranscriptionProcessor,
  ],

  exports: [
    BullModule,
    BullService,
    SubtitleTranscriptionQueueService,
    // Processors are NEVER exported — they are internal workers only
  ],
})
export class QueueModule {}
