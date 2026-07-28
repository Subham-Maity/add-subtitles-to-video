import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// PrismaClient will be imported from '@prisma/client' after running prisma generate
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

// 🎯 Centralized Logging Configuration
const LOGGING_CONFIG = {
  connectionStatus: true, // Log database connection/disconnection
  queryCounter: false, // Log query counter in development
  queryType: false, // Log query type (SELECT, INSERT, etc.)
  queryDuration: false, // Log query duration
  slowQueries: false, // Log queries taking > 100ms
  verySlowQueries: false, // Log queries taking > 1000ms
  failedQueries: false, // Log failed queries
  retryAttempts: false, // Log transaction retry attempts
} as const;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly isProduction: boolean;
  private queryCounter = 0;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    const nodeEnv = config.get<string>('NODE_ENV');
    const isProduction = nodeEnv === 'production';

    // 🔥 Prisma 7 required adapter setup
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: isProduction
        ? ['error', 'warn']
        : [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error'],
      transactionOptions: {
        maxWait: 120000,
        timeout: 120000,
      },
      errorFormat: isProduction ? 'minimal' : 'pretty',
    });

    this.isProduction = isProduction;
  }

  async onModuleInit() {
    try {
      await this.$connect();

      if (LOGGING_CONFIG.connectionStatus) {
        this.logger.log('Database connected successfully');
      }

      // Custom query logging
      if (!this.isProduction) {
        // @ts-ignore: event type not exposed in types
        this.$on('query' as any, (e: any) => {
          if (LOGGING_CONFIG.queryCounter) {
            this.queryCounter++;
          }

          const queryType = this.extractQueryType(e.query);
          const tableName = this.extractTableName(e.query);

          const logParts: string[] = [];

          if (LOGGING_CONFIG.queryCounter) {
            logParts.push(`[Query #${this.queryCounter}]`);
          }

          if (LOGGING_CONFIG.queryType) {
            logParts.push(`${queryType} → ${tableName}`);
          }

          if (LOGGING_CONFIG.queryDuration) {
            logParts.push(`(${e.duration}ms)`);
          }

          if (logParts.length > 0) {
            this.logger.log(logParts.join(' '));
          }

          if (LOGGING_CONFIG.slowQueries && e.duration > 100) {
            this.logger.debug(`Full query: ${e.query}`);
          }
        });
      }

      // Extension for slow queries + error tracking
      const config = new ConfigService();
      if (!this.isProduction || config.get<boolean>('LOG_SLOW_QUERIES')) {
        this.$extends({
          query: {
            $allModels: {
              async $allOperations({
                operation,
                model,
                args,
                query,
              }: {
                operation: string;
                model: string;
                args: any;
                query: any;
              }) {
                const startTime = Date.now();

                try {
                  const result = await query(args);
                  const duration = Date.now() - startTime;

                  if (LOGGING_CONFIG.verySlowQueries && duration > 1000) {
                    console.warn(
                      `⚠️ Slow Query (${duration}ms) - ${model}.${operation}`,
                    );
                  }

                  return result;
                } catch (error: any) {
                  if (LOGGING_CONFIG.failedQueries) {
                    console.error(
                      `❌ Query Failed - ${model}.${operation}: ${error.message}`,
                    );
                  }
                  throw error;
                }
              },
            },
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  resetQueryCounter() {
    this.queryCounter = 0;
  }

  getQueryCount(): number {
    return this.queryCounter;
  }

  async onModuleDestroy() {
    await this.$disconnect();

    if (LOGGING_CONFIG.connectionStatus) {
      this.logger.log('Database disconnected');
    }
  }

  async executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && LOGGING_CONFIG.retryAttempts) {
          this.logger.warn(
            `Transaction failed (attempt ${attempt}/${maxRetries}), retrying...`,
          );
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    if (LOGGING_CONFIG.failedQueries) {
      this.logger.error(`Transaction failed after ${maxRetries} attempts`);
    }
    throw lastError!;
  }

  private extractQueryType(query: string): string {
    const upper = query.trim().toUpperCase();
    if (upper.startsWith('SELECT')) return 'SELECT';
    if (upper.startsWith('INSERT')) return 'INSERT';
    if (upper.startsWith('UPDATE')) return 'UPDATE';
    if (upper.startsWith('DELETE')) return 'DELETE';
    if (upper.includes('ON CONFLICT')) return 'UPSERT';
    return 'QUERY';
  }

  private extractTableName(query: string): string {
    const select = query.match(/FROM\s+"public"\."(\w+)"/i);
    const insert = query.match(/INSERT INTO\s+"public"\."(\w+)"/i);
    const update = query.match(/UPDATE\s+"public"\."(\w+)"/i);
    const del = query.match(/DELETE FROM\s+"public"\."(\w+)"/i);
    const match = select || insert || update || del;

    return match ? match[1] : 'Unknown';
  }
}
