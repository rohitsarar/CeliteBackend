import fs from "fs";
import path from "path";
import winston from "winston";
import * as dotenv from "dotenv";

dotenv.config();

/** Where log files live. Override with LOG_DIR=/var/log/celite in production. */
export const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

const isProduction = process.env.NODE_ENV === "production";

// Verbose locally, quieter in production (override with LOG_LEVEL).
const level = () => process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
});

const baseFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.printf((info) => {
    const stack = info.stack ? `\n${info.stack}` : "";
    return `${info.timestamp} ${info.level}: ${info.message}${stack}`;
  }),
);

const format = isProduction
  ? baseFormat
  : winston.format.combine(winston.format.colorize({ all: true }), baseFormat);

const fileOptions = {
  maxsize: 10 * 1024 * 1024, // rotate at 10 MB
  maxFiles: 5,
  tailable: true,
};

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: path.join(LOG_DIR, "error.log"),
    level: "error",
    ...fileOptions,
  }),
  new winston.transports.File({
    filename: path.join(LOG_DIR, "all.log"),
    ...fileOptions,
  }),
];

const logger: winston.Logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

export default logger;
