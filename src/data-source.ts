import * as dotenv from 'dotenv';
import mysql from "mysql2";
import path from 'path';
import "reflect-metadata";
import { DataSource } from "typeorm";
import { Brand } from "./features/TyreDetails/brand.model";
import { Manufacturer } from "./features/TyreDetails/manufacture.model";
import { Model } from "./features/TyreDetails/model.model";
import { TyreDetails } from "./features/TyreDetails/tyre_details.model";
import { User } from "./features/user/user.model";

// Load the .env file
dotenv.config();

// Get the current filename and extension for migration location
const currentFilename = __filename;
const fileExtension = path.extname(currentFilename);
const migrationLocation = fileExtension === ".ts" ? "./src/migration/*.ts" : "";

export const AppDataSource = new DataSource({
  type: "mysql",
  driver: mysql,
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "osm",
  synchronize: false,
  logging: false,
  entities: [User, Manufacturer, Brand, Model, TyreDetails],
  migrationsTableName: "migration_table",
  migrations: [migrationLocation],
  subscribers: [],
});

// nishu db
export const AppDataSource1 = new DataSource({
    type: "mysql",
    driver: mysql,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'P@ssw0rd',
    database: process.env.DB_NAME || 'celiteTyreDB',
    synchronize: false,
    logging: false,
    entities: [User],
    migrationsTableName: "migration_table",
    migrations: [migrationLocation],
    subscribers: [],
});
