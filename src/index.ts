import { AppDataSource } from "./data.source";
import * as dotenv from 'dotenv';
import logger from "./utils/winston";
import express, { Express, Request, Response } from 'express';
import configureApp from "./config/app-config";

dotenv.config();
const port: number = Number(process.env.PORT) || 3302;
const app: Express = express();

// Load the middlewares, routes and error handlers
configureApp(app);

AppDataSource.initialize().then(async () => {

    logger.info(`Database initialized at ${new Date().toLocaleString()}`);

    app.listen(port, () => {
        logger.info(`Server started at http://localhost:${port}`);
    });

}).catch(error => {
    logger.error(`Database failed to initialize at ${new Date().toLocaleString()}`);
    logger.error(error);
});