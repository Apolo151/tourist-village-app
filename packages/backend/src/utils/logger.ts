/**
 * Structured logging utility for the application
 * 
 * Provides consistent logging format with context and metadata
 * Can be easily extended to use Winston, Pino, or other logging libraries
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'app') {
    this.serviceName = serviceName;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      ...(context && { context })
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog('warn', message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatLog('error', message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatLog('debug', message, context));
    }
  }
}

// Export singleton instance
export const logger = new Logger('backend');

// Export class for creating service-specific loggers
export const createLogger = (serviceName: string) => new Logger(serviceName);

