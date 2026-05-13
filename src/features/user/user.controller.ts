import { NextFunction, Request, Response } from "express";
import sendSuccessResponse from "../../middleware/success.handle";
import { sendUserEmail } from "../../utils/sendEmail";
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
        await postUserSchema.validateAsync(req.body);

      // Here you would typically save the user details to the database
      const userDetails = await UserRepository.createUser(
        FullName,
        email,
        contactNumber,
      );
      await sendUserEmail(userDetails);
      sendSuccessResponse(req, res, {
        userDetails,
        message: "User Details saved successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
