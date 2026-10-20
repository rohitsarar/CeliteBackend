/**
 * Tyre image maintenance CLI.
 *
 *   npm run images -- missing                     list every tyre row without an image
 *   npm run images -- propagate [--dry-run]       copy an existing image to all rows of the
 *                                                 same brand + model that have none
 *   npm run images -- fill [--dry-run] [--limit=N] [--licensed]
 *                                                 for models with NO image anywhere: look in
 *                                                 model-images.json, else Google image search,
 *                                                 upload to Cloudinary, save to every row
 *   npm run images -- set --brand=PIRELLI --model="P Zero" --url=https://...
 *                                                 manually assign one image URL to a model
 *                                                 (uploaded to Cloudinary, applied to all rows)
 *
 * Images are stored once per brand+model in Cloudinary under
 *   tyres/<brand>/<model>/<model>.jpg
 * and the same URL is written to every size/variant row of that model.
 */
import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { TyreDetails } from "../features/TyreDetails/tyre_details.model";
import { uploadBufferToCloudinary } from "../service/cloudinary.service";
import {
  downloadImage,
  isSearchConfigured,
  searchImages,
} from "../service/image-search.service";
import logger from "../utils/winston";

// ─── CLI args ────────────────────────────────────────────────────────────────
const [command = "missing", ...rest] = process.argv.slice(2);
const flags = new Map<string, string>();
for (const arg of rest) {
  const m = /^--([a-z-]+)(?:=(.*))?$/i.exec(arg);
  if (m) flags.set(m[1], m[2] ?? "true");
}
const DRY_RUN = flags.get("dry-run") === "true";
const LIMIT = Number(flags.get("limit")) || Infinity;
const LICENSED = flags.get("licensed") === "true";

const MAPPING_FILE = path.join(__dirname, "model-images.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────
const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const modelKey = (brand: string | null | undefined, model: string) =>
  `${(brand ?? "").trim().toUpperCase()}|${model.trim()}`;

const isMissing = (url: string | null | undefined) => !url || url.trim() === "";

type Group = {
  key: string;
  brand: string;
  model: string;
  rows: TyreDetails[];
  existingImage: string | null;
};

/** Group every row by brand + model, remembering any image the model already has. */
async function loadGroups(): Promise<Group[]> {
  const repo = AppDataSource.getRepository(TyreDetails);
  const all = await repo.find({ order: { manufacturerName: "ASC", modelName: "ASC", id: "ASC" } });

  const groups = new Map<string, Group>();
  for (const row of all) {
    const key = modelKey(row.brandName, row.modelName);
    const g =
      groups.get(key) ??
      ({
        key,
        brand: (row.brandName ?? "UNKNOWN").trim(),
        model: row.modelName.trim(),
        rows: [],
        existingImage: null,
      } as Group);
    g.rows.push(row);
    if (!g.existingImage && !isMissing(row.imageUrl)) g.existingImage = row.imageUrl;
    groups.set(key, g);
  }
  return [...groups.values()];
}

async function applyImageToRows(rows: TyreDetails[], imageUrl: string): Promise<number> {
  const ids = rows.filter((r) => isMissing(r.imageUrl)).map((r) => r.id);
  if (ids.length === 0) return 0;
  if (DRY_RUN) return ids.length;
  const result = await AppDataSource.getRepository(TyreDetails)
    .createQueryBuilder()
    .update(TyreDetails)
    .set({ imageUrl })
    .whereInIds(ids)
    .execute();
  return result.affected ?? 0;
}

async function uploadModelImage(brand: string, model: string, buffer: Buffer) {
  const folder = `tyres/${slugify(brand)}/${slugify(model)}`;
  const uploaded = await uploadBufferToCloudinary(buffer, folder, slugify(model));
  return uploaded.secureUrl;
}

function readMapping(): Record<string, string> {
  if (!fs.existsSync(MAPPING_FILE)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf8")) as Record<string, string>;
    // normalise keys to BRAND|Model
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!v || k.startsWith("_")) continue;
      const [b, ...m] = k.split("|");
      out[modelKey(b, m.join("|"))] = v;
    }
    return out;
  } catch (error) {
    logger.warn(`Could not read ${MAPPING_FILE}: ${(error as Error).message}`);
    return {};
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────
async function cmdMissing() {
  const repo = AppDataSource.getRepository(TyreDetails);
  const rows = await repo.find({
    where: [{ imageUrl: IsNull() }, { imageUrl: "" }],
    order: { brandName: "ASC", modelName: "ASC", id: "ASC" },
  });
  const total = await repo.count();

  console.log(`\n${rows.length} of ${total} tyre rows have no image.\n`);
  console.table(
    rows.map((r) => ({
      id: r.id,
      brand: r.brandName,
      model: r.modelName,
      size: r.size,
      car: r.manufacturerName,
      category: r.category,
    })),
  );

  const groups = await loadGroups();
  const summary = groups
    .map((g) => ({
      model: `${g.brand} ${g.model}`,
      rows: g.rows.length,
      missing: g.rows.filter((r) => isMissing(r.imageUrl)).length,
      hasImage: g.existingImage ? "yes (can propagate)" : "NO (needs fill/set)",
    }))
    .filter((g) => g.missing > 0);
  console.log("\nPer model:");
  console.table(summary);

  // CSV for the admin
  const csvPath = path.join(process.env.LOG_DIR || "logs", "missing-images.csv");
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(
    csvPath,
    ["id,brand,model,size,car,category"]
      .concat(
        rows.map((r) =>
          [r.id, r.brandName, r.modelName, r.size, r.manufacturerName, r.category]
            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      )
      .join("\n"),
  );
  console.log(`\nCSV written to ${csvPath}`);
}

/**
 * Variants that look identical to a base model and may reuse its photo:
 *   "P Zero Seal Inside" -> "P Zero", "P Zero PZ5" -> "P Zero",
 *   "Scorpion AT Plus"   -> "Scorpion All Terrain Plus"
 */
const baseModelOf = (model: string): string | null => {
  const stripped = model.replace(/\s+Seal Inside$/i, "").replace(/\s+PZ5$/i, "").trim();
  if (stripped !== model) return stripped;
  if (/^Scorpion AT Plus$/i.test(model)) return "Scorpion All Terrain Plus";
  if (/^Scorpion All Terrain Plus$/i.test(model)) return "Scorpion AT Plus";
  return null;
};

async function cmdPropagate() {
  const groups = await loadGroups();
  let updated = 0;
  const stillMissing: string[] = [];

  const imageFor = (brand: string, model: string): string | null =>
    groups.find((x) => x.brand === brand && x.model === model && x.existingImage)?.existingImage ?? null;

  for (const g of groups) {
    const missing = g.rows.filter((r) => isMissing(r.imageUrl));
    if (missing.length === 0) continue;

    let image = g.existingImage;
    let via = "same model";
    if (!image) {
      const base = baseModelOf(g.model);
      if (base) {
        image = imageFor(g.brand, base);
        via = `base model "${base}"`;
      }
    }
    if (!image) {
      stillMissing.push(`${g.brand} ${g.model} (${missing.length} rows)`);
      continue;
    }
    const n = await applyImageToRows(missing, image);
    updated += n;
    console.log(`${DRY_RUN ? "[dry-run] would copy" : "copied"} image to ${n} rows of ${g.brand} ${g.model} (from ${via})`);
  }

  console.log(`\n${DRY_RUN ? "Would update" : "Updated"} ${updated} rows.`);
  if (stillMissing.length) {
    console.log("\nModels with no image anywhere (run `fill` or `set`):");
    stillMissing.forEach((s) => console.log("  - " + s));
  }
}

async function resolveImageForModel(
  g: Group,
  mapping: Record<string, string>,
): Promise<{ url: string; via: string } | null> {
  // 1. Manual mapping file
  const mapped = mapping[g.key];
  if (mapped) return { url: mapped, via: "model-images.json" };

  // 2. Google image search
  if (!isSearchConfigured()) return null;
  const queries = [
    `${g.brand} ${g.model} tyre product photo`,
    `${g.brand} ${g.model} tire`,
  ];
  for (const q of queries) {
    const candidates = await searchImages(q, { licensedOnly: LICENSED, count: 10 });
    for (const c of candidates) {
      // Prefer pictures hosted by the brand itself, then anything usable
      if (/pirelli|michelin|bridgestone|goodyear|continental|apollo|mrf|ceat|jk/i.test(c.source)) {
        return { url: c.url, via: `google (${c.source})` };
      }
    }
    if (candidates[0]) return { url: candidates[0].url, via: `google (${candidates[0].source})` };
  }
  return null;
}

async function cmdFill() {
  const mapping = readMapping();
  const groups = (await loadGroups()).filter(
    (g) => !g.existingImage && g.rows.some((r) => isMissing(r.imageUrl)),
  );

  if (groups.length === 0) {
    console.log("Every model already has at least one image. Run `propagate` to copy them.");
    return;
  }
  if (!isSearchConfigured() && Object.keys(mapping).length === 0) {
    console.log(
      "No image source configured.\n" +
        "  Either set GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX in .env,\n" +
        `  or put URLs in ${MAPPING_FILE} (key format "BRAND|Model name").\n`,
    );
    console.log("Models needing an image:");
    groups.forEach((g) => console.log(`  - ${g.brand}|${g.model}  (${g.rows.length} rows)`));
    return;
  }

  let done = 0;
  for (const g of groups.slice(0, LIMIT)) {
    console.log(`\n→ ${g.brand} ${g.model} (${g.rows.length} rows)`);
    const found = await resolveImageForModel(g, mapping);
    if (!found) {
      console.log("  no candidate found");
      continue;
    }
    console.log(`  candidate: ${found.url}  [${found.via}]`);

    const img = await downloadImage(found.url);
    if (!img) {
      console.log("  download failed / not a usable image");
      continue;
    }
    console.log(`  downloaded ${(img.buffer.length / 1024).toFixed(0)} KB ${img.mime}`);

    if (DRY_RUN) {
      console.log(`  [dry-run] would upload to Cloudinary and update ${g.rows.length} rows`);
      done++;
      continue;
    }

    const cloudUrl = await uploadModelImage(g.brand, g.model, img.buffer);
    const n = await applyImageToRows(g.rows, cloudUrl);
    console.log(`  uploaded -> ${cloudUrl}`);
    console.log(`  updated ${n} rows`);
    done++;
    await new Promise((r) => setTimeout(r, 800)); // be polite to the search API
  }
  console.log(`\n${DRY_RUN ? "Would process" : "Processed"} ${done} of ${groups.length} models.`);
}

async function cmdSet() {
  const brand = flags.get("brand");
  const model = flags.get("model");
  const url = flags.get("url");
  const force = flags.get("force") === "true";
  if (!brand || !model || !url) {
    console.log('Usage: npm run images -- set --brand=PIRELLI --model="P Zero" --url=https://... [--force]');
    process.exitCode = 1;
    return;
  }

  const groups = await loadGroups();
  const g = groups.find((x) => x.key === modelKey(brand, model));
  if (!g) {
    console.log(`No rows found for ${brand} ${model}. Known models:`);
    groups.forEach((x) => console.log(`  - ${x.brand}|${x.model}`));
    process.exitCode = 1;
    return;
  }

  const img = await downloadImage(url);
  if (!img) {
    console.log("Could not download a usable image from that URL.");
    process.exitCode = 1;
    return;
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would upload ${(img.buffer.length / 1024).toFixed(0)} KB and update ${g.rows.length} rows`);
    return;
  }

  const cloudUrl = await uploadModelImage(g.brand, g.model, img.buffer);
  const targets = force ? g.rows : g.rows.filter((r) => isMissing(r.imageUrl));
  const ids = targets.map((r) => r.id);
  const result = await AppDataSource.getRepository(TyreDetails)
    .createQueryBuilder()
    .update(TyreDetails)
    .set({ imageUrl: cloudUrl })
    .whereInIds(ids)
    .execute();
  console.log(`uploaded -> ${cloudUrl}`);
  console.log(`updated ${result.affected ?? 0} rows of ${g.brand} ${g.model}${force ? " (forced)" : ""}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  await AppDataSource.initialize();
  try {
    if (DRY_RUN) console.log("DRY RUN: nothing will be written.\n");
    switch (command) {
      case "missing":
        await cmdMissing();
        break;
      case "propagate":
        await cmdPropagate();
        break;
      case "fill":
        await cmdFill();
        break;
      case "set":
        await cmdSet();
        break;
      default:
        console.log(`Unknown command "${command}". Use: missing | propagate | fill | set`);
        process.exitCode = 1;
    }
  } catch (error) {
    logger.error(error);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
})();
