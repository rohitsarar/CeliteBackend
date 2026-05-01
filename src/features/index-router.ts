import dotenv from "dotenv";
import { Router } from "express";
import user from "./user/user.route";
import tyreroute from "./TyreDetails/tyre_details.route";

const router = Router();
dotenv.config();

const environment = process.env.NODE_ENV || "development";

interface IRoutes {
  path: string;
  route: Router;
}

const productionRoutes: IRoutes[] = [
  {
    path: "/api/user",
    route: user,
  },

  {
    path: "/api/tyres",
    route: tyreroute,
  },
];

// Setting the production route
productionRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
