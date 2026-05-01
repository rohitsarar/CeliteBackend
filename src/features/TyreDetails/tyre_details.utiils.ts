import { AppDataSource } from "../../data-source";
import { Manufacturer } from "./manufacture.model";
import { Brand } from "./brand.model";
import { Model } from "./model.model";
import { TyreDetails } from "./tyre_details.model";
import { EntityManager } from "typeorm";

const tyreDetailsRepository = AppDataSource.getRepository(TyreDetails);

type TyreType = "manufacturer" | "brand" | "model";

export default class TyreDetailsRepository {
  // ✅ Reusable create (supports transaction)
  static async create(type: TyreType, name: string, manager?: EntityManager) {
    const dataSource = manager ?? AppDataSource;

    switch (type) {
      case "manufacturer": {
        const repo = dataSource.getRepository(Manufacturer);
        const existing = await repo.findOne({ where: { name } });
        if (existing) return existing;
        return await repo.save(repo.create({ name }));
      }

      case "brand": {
        const repo = dataSource.getRepository(Brand);
        const existing = await repo.findOne({ where: { name } });
        if (existing) return existing;
        return await repo.save(repo.create({ name }));
      }

      case "model": {
        const repo = dataSource.getRepository(Model);
        const existing = await repo.findOne({ where: { name } });
        if (existing) return existing;
        return await repo.save(repo.create({ name }));
      }

      default:
        throw new Error("Invalid type");
    }
  }

  static async createTyreCardImageWithName(
    manufacturerName: string,
    brandName: string,
    modelName: string,
    size: string,
    imageUrl: string,
  ) {
    return await AppDataSource.transaction(async (manager) => {
      // Run in parallel (fast)
      const [manufacturer, brand, model] = await Promise.all([
        this.create("manufacturer", manufacturerName, manager),
        this.create("brand", brandName, manager),
        this.create("model", modelName, manager),
      ]);

      const tyreRepo = manager.getRepository(TyreDetails);

      const tyre = tyreRepo.create({
        manufacturerId: manufacturer.id,
        brandId: brand.id,
        modelId: model.id,
        size,
        imageUrl,
      });

      return await tyreRepo.save(tyre);
    });
  }
}
