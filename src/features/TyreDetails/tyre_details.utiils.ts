import { AppDataSource } from "../../data-source";
import { TyreDetails } from "./tyre_details.model";

const tyreDetailsRepository = AppDataSource.getRepository(TyreDetails);

export default class TyreDetailsRepository {
  // ✅ Create Tyre
  static createTyreCardImageWithName = async (
    manufacturerName: string,
    brandName: string,
    modelName: string,
    size: string,
    imageUrl: string,
  ) => {
    const tyre = tyreDetailsRepository.create({
      manufacturerName,
      brandName,
      modelName,
      size,
      imageUrl,
    });

    return await tyreDetailsRepository.save(tyre);
  };

  // ✅ Get Manufacturers
  static async getManufacturers() {
    const manufacturers = await tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.manufacturer_name", "manufacturer_name")
      .orderBy("td.manufacturer_name", "ASC")
      .getRawMany();

    return manufacturers.map((item) => item.manufacturer_name);
  }
}
