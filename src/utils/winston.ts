import winston from 'winston';
import * as dotenv from 'dotenv';

dotenv.config();

// Log Levels
const levels = {
  error: 0,
  warn: 1,
  info: 2, // Adjust ed the level order to match the common sequence
  http: 3,
  debug: 4,
};

// Specify according to environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'debug';
};

// Colors for logging
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Adding colors
winston.addColors(colors);

// Creating Custom Format without colorization
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}\n`
      + `${info.stack ? info.stack : ''}` // Include stack trace if available
      + `${info.metadata ? JSON.stringify(info.metadata, null, 2) : ''}`, // Include metadata if available
  ),
);

// Creating Custom Format with colorization
const colorizedFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  baseFormat,
);

// Determine the format to use based on environment
const format = process.env.NODE_ENV !== 'production' ? colorizedFormat : baseFormat;

// Transports
const transports = [
  new winston.transports.Console(), // Logging to Console
  // Logging error logs
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),

  // Logging all logs
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Logger Initialize
const logger: winston.Logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Exporting Logs
export default logger;