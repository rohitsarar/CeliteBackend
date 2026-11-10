/**
 * Fill description / highlights / specs for every row in `tyre_details`.
 *
 *   npm run tyre-details                    dry run: shows a sample, writes nothing
 *   npm run tyre-details -- --apply         fill rows whose content is empty
 *   npm run tyre-details -- --apply --force rebuild content for ALL rows
 *
 * The content comes from features/TyreDetails/tyre-content.ts. Run with
 * --force after improving that file so existing rows pick up the changes.
 */
import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../data-source";
import { TyreDetails } from "../features/TyreDetails/tyre_details.model";
import { buildTyreContent, parseSize } from "../features/TyreDetails/tyre-content";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

(async () => {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(TyreDetails);

  const rows = await repo
    .createQueryBuilder("td")
    .addSelect(["td.description", "td.highlights", "td.specs"])
    .orderBy("td.id", "ASC")
    .getMany();

  const todo = FORCE ? rows : rows.filter((r) => !r.description || !r.specs?.length);
  const unparsed = rows.filter((r) => !parseSize(r.size));

  console.log(`Rows: ${rows.length}, to fill: ${todo.length}${FORCE ? " (--force)" : ""}`);
  if (unparsed.length) {
    console.log(`Sizes that could not be decoded (${unparsed.length}), specs will be shorter:`);
    unparsed.forEach((r) => console.log(`  #${r.id} "${r.size}"`));
  }

  if (todo[0]) {
    console.log("\nSample:", JSON.stringify({ id: todo[0].id, ...buildTyreContent(todo[0]) }, null, 2));
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write.");
    await AppDataSource.destroy();
    return;
  }

  let done = 0;
  for (const row of todo) {
    const content = buildTyreContent(row);
    await repo.update(row.id, {
      description: content.description,
      highlights: content.highlights,
      specs: content.specs,
    });
    done++;
  }

  console.log(`\nUpdated ${done} rows.`);
  await AppDataSource.destroy();
})().catch(async (error) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
