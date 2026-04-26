import { Router } from "express";
import UserController from "./user.controller";


const router = Router();

/**
 * @GET
 * @route /v1/users
 * @description Get all users
 */

router.get('/', UserController.postUsersDetails);

export default router;