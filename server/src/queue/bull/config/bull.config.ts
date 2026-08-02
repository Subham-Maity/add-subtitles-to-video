import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BullConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Handle REDIS_HOST containing both ip:port or just ip.
   * e.g. "64.227.165.227:6666" → host="64.227.165.227"
   * e.g. "localhost" → host="localhost"
   */
  get RedisHost(): string {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    return host.includes(':') ? host.split(':')[0] : host;
  }

  /**
   * If REDIS_HOST contains a port (ip:port), use that port.
   * Otherwise fall back to REDIS_PORT env var, defaulting to 6379.
   */
  get RedisPort(): number {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    if (host.includes(':')) return parseInt(host.split(':')[1], 10);
    return Number(this.configService.get<number>('REDIS_PORT') ?? 6379);
  }

  get RedisPassword(): string | undefined {
    return this.configService.get<string>('REDIS_PASSWORD') || undefined;
  }

  get RedisUsername(): string | undefined {
    return this.configService.get<string>('REDIS_USERNAME') || undefined;
  }

  get RedisDatabase(): number {
    return Number(this.configService.get<number>('REDIS_DATABASE') ?? 0);
  }

  getBullMQConfig() {
    return {
      connection: {
        host: this.RedisHost,
        port: this.RedisPort,
        username: this.RedisUsername,
        password: this.RedisPassword,
        db: this.RedisDatabase,
        connectTimeout: 50000,
      },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
      },
    };
  }
}
