import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './logger';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './error';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateConfig } from './validate/env.validation';

import { VideosModule } from './videos';
import { SubtitlesModule } from './subtitles';
import { FontsModule } from './fonts';
import { ExportModule } from './export';
import { QueueModule } from './queue';

LoggerMiddleware.configure({
  logRequest: true,
  logHeaders: false,
  logBody: false,
  logResponse: false,
  logResponseBody: false,
  logLatency: true,
  logUserAgent: false,
  logIP: false,
  logProtocol: true,
  maxResponseBodyLength: 20000,
});

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: validateConfig,
    }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 1000, // Generous limit for local studio API operations
      },
    ]),

    // File uploads
    MulterModule.register({
      dest: '../storage/temp',
    }),

    // Queue & Redis Background Jobs
    QueueModule,

    // Database
    PrismaModule,

    // Feature Modules
    VideosModule,
    SubtitlesModule,
    FontsModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
