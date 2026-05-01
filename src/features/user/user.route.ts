import { Router } from "express";
import UserController from "./user.controller";

const router = Router();

/**
 * @GET
 * @route api/v1/users
 * @description Get all users
 */

router.post("/post-user-details", UserController.postUsersDetails);

export default router;
