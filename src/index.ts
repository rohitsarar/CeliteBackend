import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import express, { Express } from "express";
import { AppDataSource } from "./data-source";
import configureApp from "./config/app-config";
import logger from "./utils/winston";

const port: number = Number(process.env.PORT) || 3302;
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
