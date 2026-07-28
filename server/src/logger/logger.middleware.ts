import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export interface LoggerOptions {
  enabled?: boolean;
  logRequest?: boolean;
  logHeaders?: boolean;
  logBody?: boolean;
  logResponse?: boolean;
  logResponseBody?: boolean; // New option
  logLatency?: boolean;
  logUserAgent?: boolean;
  logIP?: boolean;
  logProtocol?: boolean;
  colorized?: boolean;
  maxResponseBodyLength?: number; // Limit response body length
}

const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  orange: '\x1b[38;5;208m',
};

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private static options: LoggerOptions = {
    enabled: true,
    logRequest: false,
    logHeaders: false,
    logBody: false,
    logResponse: false,
    logResponseBody: false,
    logLatency: false,
    logUserAgent: false,
    logIP: false,
    logProtocol: false,
    colorized: true,
    maxResponseBodyLength: 1000, // Default: truncate after 1000 chars
  };
  private requestNumber = 0;

  static configure(options: LoggerOptions) {
    LoggerMiddleware.options = { ...LoggerMiddleware.options, ...options };
  }

  use(request: Request, response: Response, next: NextFunction): void {
    if (!LoggerMiddleware.options.enabled) {
      return next();
    }

    this.requestNumber++;
    const { method, originalUrl, headers, body, protocol, httpVersion } =
      request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;
    const start = Date.now();

    // Only log request if explicitly enabled
    this.logRequestLine(this.requestNumber, method, originalUrl);

    // Additional logs only if their respective flags are enabled
    if (LoggerMiddleware.options.logHeaders) {
      console.log(
        this.formatLog(
          this.requestNumber,
          'Headers:',
          this.getColor(JSON.stringify(headers), colors.cyan),
        ),
      );
    }

    if (LoggerMiddleware.options.logBody) {
      console.log(
        this.formatLog(
          this.requestNumber,
          'Body:',
          this.getColor(JSON.stringify(body), colors.cyan),
        ),
      );
    }

    if (LoggerMiddleware.options.logUserAgent) {
      console.log(
        this.formatLog(
          this.requestNumber,
          'User-Agent:',
          this.getColor(userAgent, colors.green),
        ),
      );
    }

    if (LoggerMiddleware.options.logIP) {
      console.log(
        this.formatLog(
          this.requestNumber,
          'IP:',
          this.getColor(ip || 'unknown', colors.green),
        ),
      );
    }

    if (LoggerMiddleware.options.logProtocol) {
      console.log(
        this.formatLog(
          this.requestNumber,
          'Protocol:',
          this.getColor(`${protocol} HTTP/${httpVersion}`, colors.cyan),
        ),
      );
    }

    // Intercept response body if logging is enabled
    if (LoggerMiddleware.options.logResponseBody) {
      const originalSend = response.send;
      const originalJson = response.json;
      let responseBody: any;

      // Override send method
      response.send = function (data: any): Response {
        responseBody = data;
        return originalSend.call(this, data);
      };

      // Override json method
      response.json = function (data: any): Response {
        responseBody = data;
        return originalJson.call(this, data);
      };

      // Store response body for later access
      (response as any).__responseBody = () => responseBody;
    }

    response.on('finish', () => {
      if (
        !LoggerMiddleware.options.logResponse &&
        !LoggerMiddleware.options.logLatency &&
        !LoggerMiddleware.options.logResponseBody
      ) {
        return;
      }

      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const end = Date.now();
      const latency = end - start;
      const parts: string[] = [];

      if (LoggerMiddleware.options.logResponse) {
        parts.push(
          this.getColor(String(statusCode), colors.yellow),
          this.getColor(String(contentLength || '-'), colors.cyan),
        );
      }

      if (LoggerMiddleware.options.logLatency) {
        const latencyColor =
          latency <= 300
            ? colors.green
            : latency <= 1000
              ? colors.yellow
              : colors.red;
        parts.push(this.getColor(`+${latency}ms`, latencyColor));
      }

      if (parts.length > 0) {
        parts.push(this.getColor('[END]', colors.magenta));
        console.log(this.formatLog(this.requestNumber, ...parts));
      }

      // Log response body if enabled
      if (LoggerMiddleware.options.logResponseBody) {
        const responseBody = (response as any).__responseBody?.();
        if (responseBody !== undefined) {
          const formattedBody = this.formatResponseBody(responseBody);
          console.log(
            this.formatLog(
              this.requestNumber,
              this.getColor('Response Body:', colors.magenta),
            ),
          );
          console.log(
            this.formatLog(
              this.requestNumber,
              this.getColor(formattedBody, colors.cyan),
            ),
          );
        }
      }
    });

    next();
  }

  private formatResponseBody(body: any): string {
    try {
      let formatted: string;

      // If body is already a string, try to parse it
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          formatted = JSON.stringify(parsed, null, 2);
        } catch {
          // If parsing fails, use the string as is
          formatted = body;
        }
      } else {
        // If body is an object, stringify it with formatting
        formatted = JSON.stringify(body, null, 2);
      }

      // Truncate if too long
      const maxLength = LoggerMiddleware.options.maxResponseBodyLength || 1000;
      if (formatted.length > maxLength) {
        formatted = formatted.substring(0, maxLength) + '\n... (truncated)';
      }

      return formatted;
    } catch (error) {
      return `[Error formatting response body: ${error.message}]`;
    }
  }

  private getColor(text: string, colorCode: string): string {
    return LoggerMiddleware.options.colorized
      ? `${colorCode}${text}${colors.reset}`
      : text;
  }

  private formatLog(number: number, ...parts: string[]): string {
    const numberColor = colors.blue;
    const baseLog = `[#${this.getColor(String(number), numberColor)}] ⇝⫸ `;
    return baseLog + parts.join(' ');
  }

  private logRequestLine(number: number, method: string, url: string) {
    if (LoggerMiddleware.options.logRequest) {
      console.log(
        this.formatLog(
          number,
          this.getColor(method, colors.yellow),
          this.getColor(url, colors.blue),
        ),
      );
    }
  }
}
