/**
 * Remove duplicate tyre rows.
 *
 *   npm run dedupe            dry run: list duplicate groups, nothing deleted
 *   npm run dedupe -- --apply delete the duplicates
 *
 * Two rows are duplicates when brand + model + size + car match after
 * lower-casing and removing spaces/hyphens. Within a group the row that is kept
 * is the one with an image (if only some have one), otherwise the lowest id.
 */
import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { TyreDetails } from "../features/TyreDetails/tyre_details.model";

const APPLY = process.argv.includes("--apply");

const norm = (s: string | null | undefined) =>
  String(s ?? "").toLowerCase().replace(/[\s\-]/g, "");

const key = (r: TyreDetails) =>
  [norm(r.brandName), norm(r.modelName), norm(r.size), norm(r.manufacturerName)].join("|");

(async () => {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(TyreDetails);
  const rows = await repo.find({ order: { id: "ASC" } });

  const groups = new Map<string, TyreDetails[]>();
  for (const r of rows) {
    const k = key(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  const toDelete: TyreDetails[] = [];
  const report: { keep: number; delete: number[]; tyre: string }[] = [];

  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const withImage = g.filter((r) => r.imageUrl && r.imageUrl.trim() !== "");
    const keep = (withImage.length ? withImage : g).sort((a, b) => a.id - b.id)[0];
    const dupes = g.filter((r) => r.id !== keep.id);
    toDelete.push(...dupes);
    report.push({
      keep: keep.id,
      delete: dupes.map((d) => d.id),
      tyre: `${keep.brandName} ${keep.modelName} | ${keep.size} | ${keep.manufacturerName}`,
    });
  }

  console.log(`Total rows: ${rows.length}`);
  console.log(`Duplicate groups: ${report.length}`);
  console.log(`Rows to delete: ${toDelete.length}\n`);
  if (report.length) {
    console.table(report.map((r) => ({ keepId: r.keep, deleteIds: r.delete.join(", "), tyre: r.tyre })));
  }

  if (!APPLY) {
    console.log("\nDRY RUN: nothing deleted. Re-run with --apply to delete.");
  } else if (toDelete.length) {
    const result = await repo.delete({ id: In(toDelete.map((d) => d.id)) });
    console.log(`\nDeleted ${result.affected ?? 0} rows. Remaining: ${rows.length - (result.affected ?? 0)}`);
  }

  await AppDataSource.destroy();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
