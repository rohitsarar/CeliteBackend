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

  static async findId(
    manufacturerName: string,
    // brandName: string,
    modelName: string,
    size: string,
  ) {
    const tyre = await tyreDetailsRepository.findOne({
      where: {
        manufacturerName,
        // brandName,
        modelName,
        size,
      },
      select: {
        id: true,
      },
    });

    return tyre?.id || null;
  }

  static async addImageUrlInDatabase(id: number, imageUrl: string) {
    const updateResult = await tyreDetailsRepository.update(id, {
      imageUrl,
    });

    return updateResult.affected ? updateResult.affected > 0 : false;
  }

  static async getTyreCardImage(
    manufacturerName?: string,
    modelName?: string,
    size?: string,
  ) {
    const queryBuilder = tyreDetailsRepository.createQueryBuilder("td");

    if (manufacturerName) {
      queryBuilder.andWhere("td.manufacturer_name = :manufacturerName", {
        manufacturerName,
      });
    }

    if (modelName) {
      queryBuilder.andWhere("td.model_name = :modelName", { modelName });
    }

    if (size) {
      queryBuilder.andWhere("td.size = :size", { size });
    }

    const result = await queryBuilder.getMany();

    return result;
  }

  // ✅ Get Manufacturers
  static async getManufacturers() {
    const manufacturers = await tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.manufacturer_name", "manufacturer_name")
      .orderBy("td.manufacturer_name", "ASC")
      .getRawMany();

    return manufacturers.map((m) => m.manufacturer_name);
  }

  static async getModelNames(manufacturerName: string) {
    const modelNames = await tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.model_name", "model_name")
      .where("td.manufacturer_name = :manufacturerName", { manufacturerName })
      .orderBy("td.model_name", "ASC")
      .getRawMany();

    return modelNames.map((m) => m.model_name);
  }

  static async getSize(manufacturerName: string, modelName: string) {
    const sizes = await tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.size", "size")
      .where(
        "td.manufacturer_name = :manufacturerName AND td.model_name = :modelName",
        { manufacturerName, modelName },
      )
      .orderBy("td.size", "ASC")
      .getRawMany();

    return sizes.map((s) => s.size);
  }
}
