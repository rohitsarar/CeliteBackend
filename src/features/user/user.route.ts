import { Router } from "express";
import UserController from "./user.controller";
import { inquiryLimiter } from "../../middleware/rate-limit";

const router = Router();

/**
 * POST /v1/api/user/post-user-details
 * Body: { FullName, email, contactNumber }
 * Saves a lead and e-mails the admin. Rate limited because it sends mail.
 */
router.post("/post-user-details", inquiryLimiter, UserController.postUsersDetails);

export default router;
