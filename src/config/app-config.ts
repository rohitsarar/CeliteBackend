import express, { Express } from 'express';
import cors from 'cors';
import logger from "../utils/winston";
import { basicLoggerMiddleware, detailedAccessLoggerMiddleware } from '../middleware/morgan';
import routesV1 from '../features/index-router';
import  errorHandlingMiddleWare  from '../middleware/error-handler';
import { IApiErrors } from '../types/error';
//import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from '@sentry/node';


const configureApp = (app: Express) => {
    Sentry.init({
        dsn: process.env.NODE_ENV === 'production' ? "https://1fd06917ceeaab69f9d5d74b8084dc51@o4507089922621440.ingest.de.sentry.io/4507089924718672" : '',
        integrations: [
            // enable HTTP calls tracing
            new Sentry.Integrations.Http({ tracing: true }),
            // enable Express.js middleware tracing
            new Sentry.Integrations.Express({ app }),
            //nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0, //  Capture 100% of the transactions
        // Set sampling rate for profiling - this is relative to tracesSampleRate
        profilesSampleRate: 1.0,
    });

    app.use(basicLoggerMiddleware);
    app.use(detailedAccessLoggerMiddleware);
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
    app.use((req,res,next)=> {Sentry.setUser({ email:req.user? req.user.email : 'unauthenticated'  }),next()})
    // Sentry.setUser({ email: "john.doe@example.com" });
    // The request handler must be the first middleware on the app
    if (process.env.NODE_ENV === 'production') app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates a trace for every incoming request
    if (process.env.NODE_ENV === 'production') app.use(Sentry.Handlers.tracingHandler());
    app.use(cors({ origin: '*' }));
    app.use(express.json({limit:'200mb'}));
    app.use(express.urlencoded({ extended: true,limit:'200mb' }));
    // app.use(redisSession);
    // app.use(keycloak.middleware()); // Keycloak Middleware
    // app.use(activityLogger)
    app.get('/', (req, res) => res.send('Express + TypeScript Server'));
    app.use('/v1', routesV1); // V1 Routes
    // The error handler must be registered before any other error middleware and after all controllers
    if (process.env.NODE_ENV === 'production') app.use(Sentry.Handlers.errorHandler());
    app.use(errorHandlingMiddleWare);
    logger.info('Express configured');
    app.use((req, res) => {
    res.status(404).json({
        status: 404,
        error: "Route not found"
    });
});
};

export default configureApp;