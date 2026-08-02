import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseBullService } from './base-bull.service';
import { BaseJobData } from '../types';

@Injectable()
export class BullService extends BaseBullService<BaseJobData> {
  constructor(
    @InjectQueue('default') queue: Queue,
    @InjectQueue('failed') failedQueue: Queue,
  ) {
    super(queue, failedQueue, BullService.name);
  }
}
