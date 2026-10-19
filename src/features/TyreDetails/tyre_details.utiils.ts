import { AppDataSource } from "../../data-source";
import { TyreDetails } from "./tyre_details.model";
import { sendCustomerInquiryEmailToAdmin } from "../../service/email/email.service";
import logger from "../../utils/winston";
import { CustomerInquiry } from "./tyre_details.validator";

const tyreDetailsRepository = AppDataSource.getRepository(TyreDetails);

export type CreateTyreInput = {
  manufacturerName: string;
  modelName: string;
  size: string;
  category: string;
  brandName?: string | null;
  imageUrl?: string | null;
};

export type TyreFilters = {
  manufacturerName?: string;
  modelName?: string;
  size?: string;
  brandName?: string;
  category?: string;
  limit?: number;
  offset?: number;
};

export default class TyreDetailsRepository {
  static async createTyreCardImageWithName(input: CreateTyreInput) {
    const tyre = tyreDetailsRepository.create({
      manufacturerName: input.manufacturerName,
      modelName: input.modelName,
      size: input.size,
      category: input.category,
      brandName: input.brandName ?? undefined,
      imageUrl: input.imageUrl ?? undefined,
    });

    return tyreDetailsRepository.save(tyre);
  }

  static async findId(manufacturerName: string, modelName: string, size: string) {
    const tyre = await tyreDetailsRepository.findOne({
      where: { manufacturerName, modelName, size },
      select: { id: true },
    });

    return tyre?.id ?? null;
  }

  static async addImageUrlInDatabase(id: number, imageUrl: string) {
    const updateResult = await tyreDetailsRepository.update(id, { imageUrl });
    return (updateResult.affected ?? 0) > 0;
  }

  static async getTyreCardImage(filters: TyreFilters) {
    const { manufacturerName, modelName, size, brandName, category } = filters;
    const limit = filters.limit ?? 200;
    const offset = filters.offset ?? 0;

    const qb = tyreDetailsRepository.createQueryBuilder("td");

    if (manufacturerName) {
      qb.andWhere("td.manufacturer_name = :manufacturerName", { manufacturerName });
    }
    if (modelName) {
      qb.andWhere("td.model_name = :modelName", { modelName });
    }
    if (size) {
      qb.andWhere("td.size = :size", { size });
    }
    if (brandName) {
      qb.andWhere("td.brand_name = :brandName", { brandName });
    }
    if (category) {
      qb.andWhere("td.category = :category", { category });
    }

    const [rows, total] = await qb
      .orderBy("td.manufacturer_name", "ASC")
      .addOrderBy("td.model_name", "ASC")
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { rows, total };
  }

  static async getManufacturers(): Promise<string[]> {
    const manufacturers = await tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.manufacturer_name", "manufacturer_name")
      .orderBy("td.manufacturer_name", "ASC")
      .getRawMany<{ manufacturer_name: string }>();

    return manufacturers.map((m) => m.manufacturer_name);
  }

  static async getModelNames(manufacturerName: string): Promise<string[]> {
    const modelNames = await tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.model_name", "model_name")
      .where("td.manufacturer_name = :manufacturerName", { manufacturerName })
      .orderBy("td.model_name", "ASC")
      .getRawMany<{ model_name: string }>();

    return modelNames.map((m) => m.model_name);
  }

  static async getSize(manufacturerName: string, modelName: string): Promise<string[]> {
    const sizes = await tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.size", "size")
      .where("td.manufacturer_name = :manufacturerName AND td.model_name = :modelName", {
        manufacturerName,
        modelName,
      })
      .orderBy("td.size", "ASC")
      .getRawMany<{ size: string }>();

    return sizes.map((s) => s.size);
  }

  static async getbrandNames(manufacturerName?: string): Promise<string[]> {
    const qb = tyreDetailsRepository
      .createQueryBuilder("td")
      .select("DISTINCT td.brand_name", "brand_name")
      .where("td.brand_name IS NOT NULL AND td.brand_name <> ''");

    if (manufacturerName) {
      qb.andWhere("td.manufacturer_name = :manufacturerName", { manufacturerName });
    }

    const brands = await qb
      .orderBy("td.brand_name", "ASC")
      .getRawMany<{ brand_name: string }>();

    return brands.map((b) => b.brand_name);
  }

  static async sendEmailToAdmin(inquiry: CustomerInquiry): Promise<boolean> {
    try {
      return await sendCustomerInquiryEmailToAdmin(inquiry);
    } catch (error) {
      logger.error(`sendEmailToAdmin failed: ${(error as Error).message}`);
      return false;
    }
  }
}
