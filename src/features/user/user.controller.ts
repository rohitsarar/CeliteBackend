import { NextFunction, Request, Response } from "express";
import sendSuccessResponse from "../../middleware/success.handle";
import { sendNewLeadEmailToAdmin } from "../../service/email/email.service";
import logger from "../../utils/winston";
import UserRepository from "./user.utils";
import postUserSchema from "./user.validator";

export default class UserController {
  public static async postUsersDetails(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { FullName, email, contactNumber } =
        await postUserSchema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });

      const userDetails = await UserRepository.createUser(
        FullName,
        email,
        contactNumber,
      );

      // The lead is already saved. Notify the admin in the background so a
      // slow or failing mail server never turns a saved lead into a 500.
      sendNewLeadEmailToAdmin({
        fullName: userDetails.FullName,
        email: userDetails.email,
        contactNumber: userDetails.contactNumber,
      }).catch((error: unknown) =>
        logger.error(`Lead e-mail failed: ${(error as Error).message}`),
      );

      return sendSuccessResponse(
        req,
        res,
        {
          userDetails: {
            id: userDetails.id,
            FullName: userDetails.FullName,
            createdAt: userDetails.createdAt,
          },
          message: "Thank you! Your details have been saved. We will contact you shortly.",
        },
        201,
      );
    } catch (error) {
      next(error);
    }
  }
}
