import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { QueryFailedError } from 'typeorm';
import logger from '../utils/winston';
import ApiError from '../utils/api-error';
import { IApiErrors } from '../types/error';

function errorHandlingMiddleWare(err: unknown, req: Request, res: Response, next: NextFunction) {

    // logger here 
    logger.error(err);

    // API Error
    if (err instanceof ApiError) {
        return res.status(err.code).json({ status: err.code, data: null, error: err.message });
    }

    // JOI Error
    if (err instanceof Joi.ValidationError) {

        type Obj = {
            label: string | number,
            msg: string
        };
        const error: Array<Obj> = [];
        err.details.forEach((e) => {
            const data = {
                label: e.path[0],
                msg: e.message,
            };
            error.push(data);
        });
        return res.status(422).json({ status: 422, data: null, error: { message: 'Validation Error', errors: error } });
    }

    // ORM errors
    if (err instanceof QueryFailedError) {
        // Check if duplicate error
        if (err.driverError.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 400, error: 'Duplicate Entry', data: null });
        }

        if (err.driverError.code === 'ER_NO_DEFAULT_FOR_FIELD') {
            return res.status(400).json({ status: 400, error: 'Missing Fields in Request', data: null });
        }
    }

    // keycloak errors
    //   if (err instanceof AxiosError) {
    //     const url = new URL(`${err.config?.url}`);
    //     /*
    //       Check the NODE Env if it is using production keycloak or development keycloak
    //     */
    //     let domain: string;
    //     if (process.env.NODE_ENV === 'development') {
    //       domain = `${url.protocol}//${url.hostname}:${url.port}`;
    //     } else {
    //       domain = `${url.protocol}//${url.hostname}`;
    //     }

    //     if (domain === process.env.KEYCLOAK_URL) {
    //       const code = err.response?.status;
    //       if (code !== undefined) {
    //         if (code === 400 || code === 401 || code === 403 || code === 404 || code === 405
    //           || code === 415 || code === 422 || code === 409) {
    //           return res.status(code).json({ status: code, error: KeycloakErrors.get(code), data: null });
    //         }
    //       }
    //     }
    //   }

    // multer errors
    // if (err instanceof multer.MulterError) {
    //     return res.status(500).json({ status: err.code, error: err.message, data: null });
    // }

    if (typeof err === 'object' && err !== null && 'type' in err) {
        const error = err as { type: string }; // Narrow down the type to an object with a `type` property
        if (error.type === 'entity.too.large') {
            res.status(413).json({ status: 413, error: 'Payload too large' })
            return;
        }
    }

    // Send Internal Sever Error
    return res.status(500).json({ status: 500, error: IApiErrors.INTERNAL_SERVER_ERROR });
}
export default errorHandlingMiddleWare;