import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { Brackets } from "typeorm";
import { AppDataSource } from "../../data-source";
import sendSuccessResponse, { sendErrorResponse } from "../../middleware/success.handle";
import { uploadBufferToCloudinary } from "../../service/cloudinary.service";
import { TyreDetails } from "./tyre_details.model";
import { buildTyreContent } from "./tyre-content";
import { TYRE_CATEGORIES, tyreIdSchema } from "./tyre_details.validator";

/**
 * Admin-only catalogue management (list, create, edit, photo, hide, delete).
 * Every route using these handlers sits behind `requireAdminKey`.
 */

const repo = () => AppDataSource.getRepository(TyreDetails);
const VALIDATE_OPTS = { abortEarly: false, stripUnknown: true } as const;
const CONTENT_COLUMNS = ["td.description", "td.highlights", "td.specs"];

// ─── Validation ──────────────────────────────────────────────────────────────

const text = Joi.string().trim().max(100);
const spec = Joi.object({
  label: Joi.string().trim().min(1).max(60).required(),
  value: Joi.string().trim().min(1).max(200).required(),
});

const contentFields = {
  description: Joi.string().trim().max(5000).allow("", null),
  highlights: Joi.array().items(Joi.string().trim().min(1).max(300)).max(20),
  specs: Joi.array().items(spec).max(40),
};

const createSchema = Joi.object({
  manufacturerName: text.min(1).required(),
  modelName: text.min(1).required(),
  size: text.min(1).required(),
  brandName: text.allow("", null).default("PIRELLI"),
  category: Joi.string().trim().uppercase().valid(...TYRE_CATEGORIES).default("PESSENGER_CAR"),
  isActive: Joi.boolean().default(true),
  ...contentFields,
});

const updateSchema = Joi.object({
  manufacturerName: text.min(1),
  modelName: text.min(1),
  size: text.min(1),
  brandName: text.allow("", null),
  category: Joi.string().trim().uppercase().valid(...TYRE_CATEGORIES),
  isActive: Joi.boolean(),
  ...contentFields,
});

const listSchema = Joi.object({
  search: Joi.string().trim().max(100).allow(""),
  status: Joi.string().valid("all", "active", "hidden").default("all"),
  limit: Joi.number().integer().min(1).max(500).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const generateSchema = Joi.object({
  manufacturerName: text.allow("", null),
  modelName: text.min(1).required(),
  size: text.min(1).required(),
  brandName: text.allow("", null),
});

/**
 * Multipart forms send arrays as JSON strings and booleans as "true"/"false".
 * Turn them back into real values before Joi sees them.
 */
const parseBody = (body: Record<string, unknown>) => {
  const out: Record<string, unknown> = { ...body };
  for (const key of ["highlights", "specs"]) {
    if (typeof out[key] === "string") {
      try {
        out[key] = JSON.parse(out[key] as string);
      } catch {
        // leave as is; Joi reports the error
      }
    }
  }
  return out;
};

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** Upload the photo under a unique id so tyres never overwrite each other's images. */
const uploadPhoto = async (file: Express.Multer.File, t: Pick<TyreDetails, "brandName" | "modelName" | "size">) => {
  const folder = ["tyres", slugify(t.brandName || "pirelli"), slugify(t.modelName)].join("/");
  const uploaded = await uploadBufferToCloudinary(
    file.buffer,
    folder,
    `${slugify(t.size)}_${Date.now()}`,
  );
  return uploaded.secureUrl;
};

const loadFull = (id: number) =>
  repo().createQueryBuilder("td").addSelect(CONTENT_COLUMNS).where("td.id = :id", { id }).getOne();

// ─── Handlers ────────────────────────────────────────────────────────────────

export default class TyreAdminController {
  /** GET /tyres/admin/list?search=&status=all|active|hidden&limit=&offset= */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, limit, offset } = await listSchema.validateAsync(req.query, VALIDATE_OPTS);
      const qb = repo().createQueryBuilder("td");

      if (status === "active") qb.andWhere("td.is_active = :a", { a: true });
      if (status === "hidden") qb.andWhere("td.is_active = :a", { a: false });

      if (search) {
        // every word must match one of the columns, e.g. "bmw p zero 245"
        search
          .split(/\s+/)
          .filter(Boolean)
          .forEach((word: string, i: number) => {
            const p = `w${i}`;
            qb.andWhere(
              new Brackets((w) =>
                w
                  .where(`td.model_name LIKE :${p}`)
                  .orWhere(`td.size LIKE :${p}`)
                  .orWhere(`td.manufacturer_name LIKE :${p}`)
                  .orWhere(`td.brand_name LIKE :${p}`)
                  .orWhere(`CAST(td.id AS CHAR) = :${p}exact`),
              ),
              { [p]: `%${word}%`, [`${p}exact`]: word },
            );
          });
      }

      const [rows, total] = await qb
        .orderBy("td.id", "DESC")
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return sendSuccessResponse(req, res, { data: rows, total, limit, offset });
    } catch (error) {
      next(error);
    }
  }

  /** GET /tyres/admin/options — existing cars, models and brands for the form dropdowns. */
  static async options(req: Request, res: Response, next: NextFunction) {
    try {
      const distinct = async (column: string) =>
        (
          await repo()
            .createQueryBuilder("td")
            .select(`DISTINCT td.${column}`, "v")
            .where(`td.${column} IS NOT NULL AND td.${column} <> ''`)
            .orderBy("v", "ASC")
            .getRawMany<{ v: string }>()
        ).map((r) => r.v);

      return sendSuccessResponse(req, res, {
        data: {
          manufacturers: await distinct("manufacturer_name"),
          models: await distinct("model_name"),
          brands: await distinct("brand_name"),
          categories: TYRE_CATEGORIES,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /tyres/admin/:id — full row including hidden tyres and content. */
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = await tyreIdSchema.validateAsync(req.params, VALIDATE_OPTS);
      const tyre = await loadFull(id);
      if (!tyre) return sendErrorResponse(req, res, "Tyre not found", 404);
      return sendSuccessResponse(req, res, { data: tyre });
    } catch (error) {
      next(error);
    }
  }

  /** POST /tyres/admin/generate-content — preview auto-generated description/highlights/specs. */
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const input = await generateSchema.validateAsync(req.body, VALIDATE_OPTS);
      return sendSuccessResponse(req, res, { data: buildTyreContent(input) });
    } catch (error) {
      next(error);
    }
  }

  /** POST /tyres/admin — multipart; `image` optional. Empty content is auto-generated. */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = await createSchema.validateAsync(parseBody(req.body), VALIDATE_OPTS);
      const generated = buildTyreContent(input);

      const tyre = repo().create({
        manufacturerName: input.manufacturerName,
        modelName: input.modelName,
        size: input.size,
        brandName: input.brandName || "PIRELLI",
        category: input.category,
        isActive: input.isActive,
        description: input.description || generated.description,
        highlights: input.highlights?.length ? input.highlights : generated.highlights,
        specs: input.specs?.length ? input.specs : generated.specs,
      });

      if (req.file) tyre.imageUrl = await uploadPhoto(req.file, tyre);

      const saved = await repo().save(tyre);
      return sendSuccessResponse(req, res, { message: "Tyre added", data: await loadFull(saved.id) }, 201);
    } catch (error) {
      next(error);
    }
  }

  /** PUT /tyres/admin/:id — multipart; only the fields sent are changed. `image` replaces the photo. */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = await tyreIdSchema.validateAsync(req.params, VALIDATE_OPTS);
      const patch = await updateSchema.validateAsync(parseBody(req.body), VALIDATE_OPTS);

      const tyre = await loadFull(id);
      if (!tyre) return sendErrorResponse(req, res, "Tyre not found", 404);

      Object.assign(tyre, patch);
      if (patch.brandName === "") tyre.brandName = "PIRELLI";
      if (req.file) tyre.imageUrl = await uploadPhoto(req.file, tyre);

      await repo().save(tyre);
      return sendSuccessResponse(req, res, { message: "Tyre updated", data: await loadFull(id) });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /tyres/admin/:id — permanent. The photo stays in Cloudinary. */
  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = await tyreIdSchema.validateAsync(req.params, VALIDATE_OPTS);
      const result = await repo().delete(id);
      if (!result.affected) return sendErrorResponse(req, res, "Tyre not found", 404);
      return sendSuccessResponse(req, res, { message: "Tyre deleted permanently", data: { id } });
    } catch (error) {
      next(error);
    }
  }
}
