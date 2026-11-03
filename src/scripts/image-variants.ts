/**
 * Spread several official product photos across the rows of each tyre model,
 * so a catalogue page does not show the same picture on every card.
 *
 *   npm run images:variants                 dry run: show what would change
 *   npm run images:variants -- --apply      upload to Cloudinary and update the DB
 *   npm run images:variants -- --model="P Zero" [--apply]   one model only
 *
 * Source photos are listed per model in model-variants.json (3/4 view, side
 * view, front/tread view). Each photo is uploaded once to Cloudinary under
 *   tyres/<brand>/<model>/variants/<name>
 * and the rows of the model are assigned round-robin in catalogue order
 * (car, size), so neighbouring cards get different views. The assignment is
 * deterministic: running it twice gives the same result.
 *
 * Models that are not in the JSON file are left untouched.
 */
import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { AppDataSource } from "../data-source";
import { TyreDetails } from "../features/TyreDetails/tyre_details.model";
import { uploadBufferToCloudinary } from "../service/cloudinary.service";
import { downloadImage } from "../service/image-search.service";
import logger from "../utils/winston";

// ─── CLI args ────────────────────────────────────────────────────────────────
const flags = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  const m = /^--([a-z-]+)(?:=(.*))?$/i.exec(arg);
  if (m) flags.set(m[1], m[2] ?? "true");
}
const APPLY = flags.get("apply") === "true";
const ONLY_MODEL = (flags.get("model") ?? "").trim().toLowerCase();

const VARIANTS_FILE = path.join(__dirname, "model-variants.json");
const REPORT_FILE = path.join(__dirname, "..", "..", "data", "image-variants.report.json");

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const modelKey = (brand: string | null | undefined, model: string) =>
  `${(brand ?? "").trim().toUpperCase()}|${model.trim()}`;

type VariantConfig = { base: string; byModel: Map<string, string[]> };

function readConfig(): VariantConfig {
  const raw = JSON.parse(fs.readFileSync(VARIANTS_FILE, "utf8")) as Record<string, unknown>;
  const base = String(raw._base ?? "");
  const byModel = new Map<string, string[]>();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_") || !Array.isArray(v)) continue;
    const [b, ...m] = k.split("|");
    const paths = v.map(String).filter(Boolean);
    if (paths.length) byModel.set(modelKey(b, m.join("|")), paths);
  }
  return { base, byModel };
}

/** Stable Cloudinary public id for one source photo, e.g. "visori_3_4_pzero" */
const variantName = (relPath: string) => {
  // for proxy URLs (…/_next/image?url=<encoded asset>&w=…) name it after the asset inside
  const proxied = /[?&]url=([^&]+)/.exec(relPath);
  const asset = proxied ? decodeURIComponent(proxied[1]).replace(/^.*\/assets\//, "") : relPath;
  return slugify(asset.replace(/\.[a-z0-9]+$/i, ""));
};

/** Rows in the order the storefront lists them, so round-robin spreads views across neighbours. */
function catalogueOrder(a: TyreDetails, b: TyreDetails): number {
  return (
    a.manufacturerName.localeCompare(b.manufacturerName) ||
    a.size.localeCompare(b.size, undefined, { numeric: true }) ||
    a.id - b.id
  );
}

async function uploadVariant(brand: string, model: string, url: string, relPath: string): Promise<string | null> {
  const dl = await downloadImage(url);
  if (!dl) {
    logger.warn(`  download failed: ${url}`);
    return null;
  }
  const folder = `tyres/${slugify(brand)}/${slugify(model)}/variants`;
  const uploaded = await uploadBufferToCloudinary(dl.buffer, folder, variantName(relPath));
  return uploaded.secureUrl;
}

async function main() {
  const { base, byModel } = readConfig();
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(TyreDetails);
  const all = await repo.find();

  // group rows by brand|model
  const groups = new Map<string, TyreDetails[]>();
  for (const row of all) {
    const key = modelKey(row.brandName, row.modelName);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const report: Record<string, unknown>[] = [];
  let totalRows = 0;
  let totalChanged = 0;

  for (const [key, rows] of groups) {
    const paths = byModel.get(key);
    const [brand, model] = key.split("|");
    if (!paths) {
      report.push({ model: key, rows: rows.length, status: "no variants configured, left as is" });
      continue;
    }
    if (ONLY_MODEL && model.toLowerCase() !== ONLY_MODEL) continue;

    // Never use more views than there are rows; keep the list order (3/4 view first).
    // If a photo cannot be downloaded, the next one in the list takes its place.
    const useCount = Math.min(paths.length, rows.length);
    console.log(`\n${key}: ${rows.length} rows -> up to ${useCount} different photos`);

    // 1. upload (or pretend to) photos until we have enough
    const urls: string[] = [];
    for (const rel of paths) {
      if (urls.length >= useCount) break;
      // entries may be absolute (e.g. Pirelli's image proxy for oversized originals)
      const src = /^https?:\/\//i.test(rel) ? rel : base + rel;
      if (!APPLY) {
        urls.push(`<cloudinary>/tyres/${slugify(brand)}/${slugify(model)}/variants/${variantName(rel)}`);
        continue;
      }
      const url = await uploadVariant(brand, model, src, rel);
      if (url) urls.push(url);
      console.log(`  ${url ? "uploaded" : "SKIPPED "} ${rel}`);
    }
    if (urls.length === 0) {
      report.push({ model: key, rows: rows.length, status: "all uploads failed, left as is" });
      continue;
    }

    // 2. assign round-robin in catalogue order
    const ordered = [...rows].sort(catalogueOrder);
    const perImage = new Map<string, number>();
    let changed = 0;
    for (let i = 0; i < ordered.length; i++) {
      const row = ordered[i];
      const url = urls[i % urls.length];
      perImage.set(url, (perImage.get(url) ?? 0) + 1);
      if (row.imageUrl === url) continue;
      changed++;
      if (APPLY) await repo.update(row.id, { imageUrl: url });
    }
    totalRows += ordered.length;
    totalChanged += changed;
    for (const [url, n] of perImage) console.log(`  ${String(n).padStart(3)} rows -> ${url.replace(/^.*\/variants\//, "")}`);
    report.push({ model: key, rows: rows.length, photos: urls.length, changed, status: APPLY ? "applied" : "dry run" });
  }

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify({ at: new Date().toISOString(), apply: APPLY, report }, null, 2));

  console.log(`\n${APPLY ? "Updated" : "Would update"} ${totalChanged} of ${totalRows} rows. Report: ${REPORT_FILE}`);
  if (!APPLY) console.log("Dry run only. Re-run with --apply to upload and save.");
  await AppDataSource.destroy();
}

main().catch(async (error) => {
  logger.error(`image-variants failed: ${(error as Error).stack ?? error}`);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
