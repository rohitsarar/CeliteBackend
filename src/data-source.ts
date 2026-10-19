import * as dotenv from "dotenv";
import mysql from "mysql2";
import path from "path";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { TyreDetails } from "./features/TyreDetails/tyre_details.model";
import { User } from "./features/user/user.model";

// Load the .env file
dotenv.config();

// When running from ts-node we are in ./src, when running the compiled build we
// are in ./dist. Point the migration glob at the right folder for either case.
const isTs = path.extname(__filename) === ".ts";
const migrationLocation = isTs
  ? path.join(__dirname, "migration", "*.ts")
  : path.join(__dirname, "migration", "*.js");

export const AppDataSource = new DataSource({
  type: "mysql",
  driver: mysql,
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || "root",
  // No hardcoded fallback password: production must supply DB_PASSWORD.
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "celiteTyreDB",
  synchronize: false,
  logging: process.env.DB_LOGGING === "true",
  entities: [User, TyreDetails],
  migrationsTableName: "migration_table",
  migrations: [migrationLocation],
  subscribers: [],
  // Keep the pool healthy behind a reverse proxy / long idle periods
  extra: {
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  },
});
