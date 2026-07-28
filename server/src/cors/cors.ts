import { INestApplication, Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// Development origins - Add all your local development URLs here
const DEV_ORIGINS = [
  'http://localhost:3336',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

// Production origins - Add all your production URLs here
const PROD_ORIGINS = [''];

export const configureCors = (app: INestApplication): void => {
  const logger = new Logger('CORS');

  // Automatically detects from process.env.NODE_ENV (set by cross-env in scripts)
  const isProduction = process.env.NODE_ENV === 'production';

  // Select origins based on environment
  const allowedOrigins = isProduction ? PROD_ORIGINS : DEV_ORIGINS;

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error(`CORS blocked for: ${origin}`));
      }
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-type', 'Cookie'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 3600,
    preflightContinue: false,
  };

  app.enableCors(corsOptions);

  logger.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  logger.log(`✅ CORS allowed origins: ${allowedOrigins.join(', ')}`);
};
