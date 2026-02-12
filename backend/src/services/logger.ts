import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Try to create log directory - fall back to console-only if it fails
let fileLoggingEnabled = true;
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`[logger] Could not create log directory ${LOG_DIR}: ${err}. File logging disabled.`);
  fileLoggingEnabled = false;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

const transports: winston.transport[] = [];

if (fileLoggingEnabled) {
  // Info level: all operational events
  transports.push(new DailyRotateFile({
    filename: path.join(LOG_DIR, 'info-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxFiles: '30d',
    maxSize: '20m',
    format: logFormat,
  }));

  // Error/Warning level: errors and warnings only
  transports.push(new DailyRotateFile({
    filename: path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'warn',
    maxFiles: '90d',
    maxSize: '20m',
    format: logFormat,
  }));

  // Debug level: verbose debug information
  transports.push(new DailyRotateFile({
    filename: path.join(LOG_DIR, 'debug-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'debug',
    maxFiles: '7d',
    maxSize: '50m',
    format: logFormat,
  }));
}

// Always add console transport (for systemd journal capture and fallback)
transports.push(new winston.transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp} ${level} ${message}${metaStr}`;
    })
  ),
}));

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
});

// Helper: get available log files
export function getLogFiles(): { name: string; date: string; level: string; size: number }[] {
  if (!fs.existsSync(LOG_DIR)) return [];
  const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log'));
  return files.map(f => {
    const stat = fs.statSync(path.join(LOG_DIR, f));
    const match = f.match(/^(info|error|debug)-(\d{4}-\d{2}-\d{2})\.log$/);
    return {
      name: f,
      date: match?.[2] || '',
      level: match?.[1] || 'unknown',
      size: stat.size,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// Helper: read a log file
export function readLogFile(filename: string): string {
  const filePath = path.join(LOG_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper: get log entries with filtering
export function getLogEntries(
  options: { level?: string; date?: string; search?: string; limit?: number; offset?: number }
): { entries: string[]; total: number } {
  const { level = 'info', date, search, limit = 200, offset = 0 } = options;
  const dateStr = date || new Date().toISOString().split('T')[0];
  const filename = `${level}-${dateStr}.log`;
  const content = readLogFile(filename);
  if (!content) return { entries: [], total: 0 };

  let lines = content.split('\n').filter(l => l.trim());

  if (search) {
    const searchLower = search.toLowerCase();
    lines = lines.filter(l => l.toLowerCase().includes(searchLower));
  }

  // Reverse so newest entries are first
  lines.reverse();

  const total = lines.length;
  const entries = lines.slice(offset, offset + limit);
  return { entries, total };
}

export default logger;
