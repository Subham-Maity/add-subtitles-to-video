import { registerAs } from '@nestjs/config';

export const fontsConfig = registerAs('fonts', () => ({
  fontsDir: process.env.FONTS_DIR || '../client/public/lang',
}));
