import dotenv from 'dotenv';
import { Router } from 'express';
import user from './user/user.route';

const router = Router();
dotenv.config();

const environment = process.env.NODE_ENV || 'development';

interface IRoutes {
    path: string,
    route: Router
}

const productionRoutes: IRoutes[] = [
     {
        path: '/user',
        route: user
    },
 
];

// Setting the production route
productionRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

export default router;