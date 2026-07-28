import { Module } from '@nestjs/common';
import { FontsController } from './controller';
import { FontScannerService } from './service';

@Module({
  controllers: [FontsController],
  providers: [FontScannerService],
  exports: [FontScannerService],
})
export class FontsModule {}
