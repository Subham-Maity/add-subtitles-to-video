import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiDocReady, logApplicationDetails, logServerReady } from './logger';
import { json } from 'express';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { configureCors } from './cors';
import { AllExceptionsFilter, HttpExceptionFilter } from './error';
import { setupSwagger } from './swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

const port: number = 3336;
const prefix: string = 'xam';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  //Trust proxy
  app.set('trust proxy', 1);
  // 1. Body parser (FIRST)
  app.use(json({ limit: '50mb' }));

  // 2. Cookie parser
  app.use(cookieParser());

  // 3. CORS configuration
  configureCors(app);

  // 4. Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      //TODO: IF needed uncomment
      whitelist: true,
      // forbidNonWhitelisted: true,
      transform: true,
      skipMissingProperties: false,
    }),
  );

  // 6. Exception filters
  app.useGlobalFilters(new HttpExceptionFilter(), new AllExceptionsFilter());

  // 7. Static assets
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // 8. API prefix
  app.setGlobalPrefix(prefix);

  // 9. Swagger (should be after prefix)
  setupSwagger(app);

  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT') || port, '0.0.0.0');
  return configService;
}

bootstrap().then((configService) => {
  logServerReady(configService.get('PORT') || port);
  logApplicationDetails(configService);
  ApiDocReady(configService.get('port') || port, configService);
});
