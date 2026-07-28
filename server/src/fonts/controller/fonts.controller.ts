import { Controller, Get } from '@nestjs/common';
import { FontScannerService } from '../service';

@Controller('fonts')
export class FontsController {
  constructor(private readonly fontScanner: FontScannerService) {}

  @Get()
  getFonts() {
    return this.fontScanner.scanFonts();
  }
}
