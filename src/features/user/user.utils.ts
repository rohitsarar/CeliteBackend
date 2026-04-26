import { AppDataSource } from "../../data-source";
import { User } from "./user.model";

const userRepository = AppDataSource.getRepository(User);

export default class UserRepository {
  //HERE IS USER DETAILS CREATION SERVICE SAVE IN DATABASE
  static async createUser(
    FullName: string,
    email: string,
    contactNumber: string,
  ) {
    return await userRepository.save({
      FullName,
      email,
      contactNumber,
    });
  }
}
