import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import express, { Express } from "express";
import { AppDataSource } from "./data-source";
import configureApp from "./config/app-config";
import logger from "./utils/winston";

const port: number = Number(process.env.PORT) || 3302;

// Warn loudly about settings that are easy to forget when going live.
if (process.env.NODE_ENV === "production") {
  const warnings: string[] = [];
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.trim() === "*") {
    warnings.push("CORS_ORIGIN is '*'; set it to the site's domain(s).");
  }
  if (process.env.TRUST_PROXY !== "true") {
    warnings.push(
      "TRUST_PROXY is not 'true'; behind a proxy all visitors share one IP and hit the rate limit together.",
    );
  }
  if (!process.env.DB_PASSWORD) warnings.push("DB_PASSWORD is empty.");
  if (!process.env.ADMIN_API_KEY) warnings.push("ADMIN_API_KEY is not set; admin uploads are disabled.");
  warnings.forEach((w) => logger.warn(`[config] ${w}`));
}
const app: Express = express();

// Load the middlewares, routes and error handlers
configureApp(app);

let server: ReturnType<Express["listen"]> | undefined;

AppDataSource.initialize()
  .then(() => {
    logger.info(`Database initialized at ${new Date().toLocaleString()}`);

    server = app.listen(port, () => {
      logger.info(
        `Server started on port ${port} (${process.env.NODE_ENV || "development"})`,
      );
    });
  })
  .catch((error) => {
    logger.error(`Database failed to initialize at ${new Date().toLocaleString()}`);
    logger.error(error);
    // Exit so the process manager (pm2 / docker / systemd) restarts us instead of
    // leaving a half-alive process with no DB connection.
    process.exit(1);
  });

// ─── Process-level safety nets ───────────────────────────────────────────────
const shutdown = (code = 0) => {
  logger.info("Shutting down gracefully...");
  const closeDb = () =>
    AppDataSource.isInitialized ? AppDataSource.destroy() : Promise.resolve();

  if (server) {
    server.close(() => {
      closeDb().finally(() => process.exit(code));
    });
    // Force exit if connections refuse to close in time
    setTimeout(() => process.exit(code), 10_000).unref();
  } else {
    closeDb().finally(() => process.exit(code));
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection");
  logger.error(reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception, shutting down");
  logger.error(error);
  shutdown(1);
});

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
