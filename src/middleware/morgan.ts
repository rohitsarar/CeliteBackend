/* eslint-disable @typescript-eslint/ban-ts-comment */
import fs from 'fs';
import path from 'path';
import morgan, { StreamOptions } from 'morgan';
import logger from '../utils/winston';

// Create a write stream for the access log file
const accessLogStream = fs.createWriteStream(path.join(process.cwd(), 'logs', 'access.log'), { flags: 'a' });

// Create a StreamOptions for the access log
const accessLogStreamOptions: StreamOptions = {
    write: (message) => accessLogStream.write(`${message}\n`),
};

// Create the morgan middleware for basic logging to Winston
const basicLoggerMiddleware = morgan((tokens, req, res) => {
    // @ts-ignore
    const user = req.user ? `${req.user.email}/${req.user.role}` : 'unauthenticated';
    // @ts-ignore
    const ip = req.ip || req.connection.remoteAddress || '-';
    // @ts-ignore
    const mac = req.mac || '-';

    const logMessage = `${user} - ${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ${tokens.res(req, res, 'content-length')} - ${tokens['response-time'](req, res)} ms ip: ${ip} mac: ${mac}`;

    return logMessage;
}, { stream: { write: (message) => logger.http(message) } }); // Using Winston Logger http severity

// Create the morgan middleware for detailed logging to the access log file
const detailedAccessLoggerMiddleware = morgan((tokens, req, res) => {
    // @ts-ignore
    const user = req.user ? `${req.user.email}/${req.user.role}` : 'unauthenticated';
    // @ts-ignore
    const ip = req.ip || req.connection.remoteAddress || '-';
    // @ts-ignore
    const mac = req.mac || '-';

    const requestHeaders = JSON.stringify(req.headers);
    const requestBody = JSON.stringify(tokens.body);

    const logMessage = `${user} - ${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ${tokens.res(req, res, 'content-length')} - ${tokens['response-time'](req, res)} ms ip: ${ip} mac: ${mac} headers: ${requestHeaders} body: ${requestBody}`;

    return logMessage;
}, { stream: accessLogStreamOptions });

export { basicLoggerMiddleware, detailedAccessLoggerMiddleware };