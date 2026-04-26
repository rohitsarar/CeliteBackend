import { Request, Response, NextFunction } from "express";
import postUserSchema from "./user.validator";
import UserRepository from "./user.utils";
import sendSuccessResponse from "../../middleware/success.handle";

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

      sendSuccessResponse(req, res, {
        userDetails,
        message: "User Details saved successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
