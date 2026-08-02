import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RedisConnectionChecker implements OnModuleInit {
  private readonly logger = new Logger(RedisConnectionChecker.name);

  constructor(@InjectQueue('default') private readonly defaultQueue: Queue) {}

  async onModuleInit() {
    try {
      await this.defaultQueue.waitUntilReady();
      this.logger.log('Redis connection ready (BullMQ default queue)');
    } catch (error) {
      this.logger.error(
        'Redis connection failed on startup:',
        (error as Error).message,
      );
    }
  }
}
