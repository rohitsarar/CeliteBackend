/**
 * Import tyres from a Pirelli-style price-list Excel into `tyre_details`.
 *
 *   npm run import:excel -- --file=data/Book19.xlsx             dry run (nothing written)
 *   npm run import:excel -- --file=data/Book19.xlsx --apply     insert the NEW rows
 *
 * Options
 *   --sheet=<name>      sheet to read (default: first sheet)
 *   --brand=PIRELLI     brand_name to store (default PIRELLI)
 *   --category=PESSENGER_CAR
 *   --desc-col=F --car-col=H --rft-col=G   column letters (defaults match Book19)
 *
 * Each description looks like  "225/55R17 97Y r-f P7cint(*)(MOE)"  and is split into
 *   size  -> "225/55R17 97Y RFT"      (dims, load/speed, XL, RFT – same style as the DB)
 *   model -> "P7 Cinturato"           (short code mapped to the full name)
 *   car   -> column H ("BMW", "Mercedes", ...) or "Standard" when blank
 *
 * Rows that already exist (same brand + model + size + car, ignoring case/spaces) are
 * skipped, so the import can be re-run safely. A JSON report is written next to the file.
 */
import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { TyreDetails } from "../features/TyreDetails/tyre_details.model";

// ─── CLI ─────────────────────────────────────────────────────────────────────
const flags = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  const m = /^--([a-z-]+)(?:=(.*))?$/i.exec(arg);
  if (m) flags.set(m[1], m[2] ?? "true");
}
const FILE = flags.get("file");
const APPLY = flags.get("apply") === "true";
const BRAND = (flags.get("brand") || "PIRELLI").toUpperCase();
const CATEGORY = (flags.get("category") || "PESSENGER_CAR").toUpperCase();
const DESC_COL = (flags.get("desc-col") || "F").toUpperCase();
const CAR_COL = (flags.get("car-col") || "H").toUpperCase();
const RFT_COL = (flags.get("rft-col") || "G").toUpperCase();

if (!FILE) {
  console.log("Usage: npm run import:excel -- --file=data/Book19.xlsx [--apply]");
  process.exit(1);
}

// ─── Model code → full name ──────────────────────────────────────────────────
// Keys are compared after upper-casing and removing spaces, hyphens and slashes.
const MODEL_MAP: Record<string, string> = {
  // Cinturato P7 family
  P7CINT: "P7 Cinturato",
  P7CNT: "P7 Cinturato",
  "7CINT": "P7 Cinturato",
  "7CNT": "P7 Cinturato",
  P7CINTSEALINSIDE: "P7 Cinturato Seal Inside",
  P7AS: "P7 All Season",
  P7BLUE: "Cinturato P7 Blue",
  CINTC3: "Cinturato C3",
  // P Zero family
  PZERO: "P Zero",
  PZEROE: "P Zero E",
  PZERO5: "P Zero PZ5",
  PZRAS: "P Zero All Season",
  // Scorpion family
  SVERD: "Scorpion Verde",
  SCVERD: "Scorpion Verde",
  SVERDE: "Scorpion Verde",
  SVEAS: "Scorpion Verde All Season",
  SZROAS: "Scorpion Zero All Season",
  SZERO: "Scorpion Zero",
  SCORPN: "Scorpion",
  SCORPION: "Scorpion",
  SCMS: "Scorpion MS",
  "SAT+": "Scorpion All Terrain Plus",
  "AT+": "Scorpion All Terrain Plus",
  ATR: "Scorpion ATR",
  // Others
  PWRGY2: "Powergy",
  PWRGY: "Powergy",
};

// Tokens that are OE / technology markers, not part of the model name
const NOISE_TOKENS = new Set([
  "NCS", "ELT", "KS", "J", "L", "L1", "NO", "NCO", "NC0", "N0", "N1", "MO", "MOE",
  "AO", "VOL", "RO1", "B", "EMT", "LR", "TL", "RNF", "§", "PIRELLI", "NON", "MARKING",
  "MARKED", "RFT", "WL",
]);

const CAR_MAP: Record<string, string> = {
  "": "Standard",
  BMW: "BMW",
  MERCEDES: "Mercedes",
  AUDI: "Audi",
  "BMW-MERCEDES": "BMW-Mercedes",
  JLR: "JLR",
  VOLVO: "Volvo",
  PORSCHE: "Porsche",
  "ALFA ROMEO": "Alfa Romeo",
  NIO: "NIO",
  LAMBORGHINI: "Lamborghini",
  BENTLEY: "Bentley",
  FERRARI: "Ferrari",
  MASERATI: "Maserati",
  "LAND ROVER": "JLR",
  JAGUAR: "JLR",
};

// Older rows in the database used a different spelling for the same model.
// Both spellings are treated as the same tyre when checking for duplicates.
const MODEL_ALIASES: Record<string, string> = {
  "scorpionatplus": "scorpionallterrainplus",
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

// ─── Parsing ─────────────────────────────────────────────────────────────────
type Parsed = {
  row: number;
  raw: string;
  size: string;
  model: string;
  car: string;
  rft: boolean;
  warnings: string[];
};
type Rejected = { row: number; raw: string; reason: string };

// 1) dims:  [P|LT|HL] 225 / 45 [R|ZR|/] 18      2) load/speed: (97Y) | 97Y | 97 Y  (optional)
const DIMS_RE =
  /^(P|LT|HL)?\s*(\d{3})\s*\/\s*(\d{2})\s*(?:(ZR|R)\s*|\/\s*)(\d{2})\s*C?\s*/i;
const LOAD_RE = /^\(?\s*(\d{2,3})\s*([A-Z])\s*\)?\s*/i;

function parseDescription(
  row: number,
  rawDesc: string,
  carCell: string,
  rftCell: string,
): Parsed | Rejected {
  const raw = rawDesc.replace(/\s+/g, " ").trim();
  const warnings: string[] = [];

  const dm = DIMS_RE.exec(raw);
  if (!dm) return { row, raw, reason: "no tyre size found" };

  const prefix = (dm[1] || "").toUpperCase();
  const width = dm[2];
  const aspect = dm[3];
  const radial = (dm[4] || "R").toUpperCase(); // "/" separator means plain R
  const rim = dm[5];
  let rest = raw.slice(dm[0].length).trim();

  // load index + speed rating
  let loadSpeed = "";
  const lm = LOAD_RE.exec(rest);
  if (lm) {
    loadSpeed = `${lm[1]}${lm[2].toUpperCase()}`;
    rest = rest.slice(lm[0].length).trim();
  } else {
    warnings.push("no load index / speed rating in description");
  }

  // flags inside the tail
  let xl = false;
  let rft = /\bRFT\b/i.test(rftCell);
  let sealInside = false;

  // Drop OE markings in parentheses, e.g. (*)(MOE)(N0)
  rest = rest.replace(/\([^)]*\)/g, " ");

  // Normalise glued tokens:  "XLr-fP7cint" -> "XL r-f P7cint"
  rest = rest
    .replace(/XL/gi, " XL ")
    .replace(/R-?F(?=[A-Z])/gi, " R-F ")
    .replace(/\bS-?I(?=[A-Z])/gi, " S-I ")
    .replace(/RFT/gi, " RFT ")
    .replace(/NCS|ELT|EMT/gi, (t) => ` ${t} `)
    .replace(/\s+/g, " ")
    .trim();

  const modelTokens: string[] = [];
  for (const tok of rest.split(" ")) {
    const t = tok.trim();
    if (!t) continue;
    const u = t.toUpperCase();
    if (u === "XL") { xl = true; continue; }
    if (u === "R-F" || u === "RF" || u === "RFT") { rft = true; continue; }
    if (u === "S-I" || u === "SI") { sealInside = true; continue; }
    if (NOISE_TOKENS.has(u)) continue;
    modelTokens.push(t);
  }

  // Model lookup: try the whole tail first, then progressively shorter prefixes
  const normalise = (s: string) => s.toUpperCase().replace(/[\s\-\/.]/g, "");
  let model = "";
  for (let n = modelTokens.length; n > 0 && !model; n--) {
    const candidate = normalise(modelTokens.slice(0, n).join(" "));
    if (MODEL_MAP[candidate]) model = MODEL_MAP[candidate];
  }
  if (!model) {
    // Last attempt: any single token that maps, also after peeling glued OE
    // letters off the end ("P-ZEROL" -> "PZERO", "PZERONO" -> "PZERO").
    outer: for (const t of modelTokens) {
      let c = normalise(t);
      while (c.length >= 4) {
        if (MODEL_MAP[c]) { model = MODEL_MAP[c]; break outer; }
        const peeled = c.replace(/(NCS|ELT|NCO|NC0|NO|KS|L|J|B)$/, "");
        if (peeled === c) break;
        c = peeled;
      }
    }
  }
  if (!model) {
    return {
      row,
      raw,
      reason: `unknown model code "${modelTokens.join(" ") || "(none)"}"`,
    };
  }
  if (sealInside && !/Seal Inside/i.test(model)) model = `${model} Seal Inside`;

  // Size in the same style as the existing rows
  const size = [
    `${prefix}${width}/${aspect}${radial}${rim}`,
    loadSpeed,
    xl ? "XL" : "",
    rft ? "RFT" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const carKey = carCell.trim().toUpperCase();
  const car = CAR_MAP[carKey] ?? titleCase(carCell.trim());
  if (!(carKey in CAR_MAP)) warnings.push(`unmapped car name "${carCell}"`);

  return { row, raw, size, model, car, rft, warnings };
}

// ─── Main ────────────────────────────────────────────────────────────────────
const dedupKey = (model: string, size: string, car: string) => {
  const m = model.toLowerCase().replace(/[\s\-]/g, "");
  const canonicalModel = MODEL_ALIASES[m] ?? m;
  return `${canonicalModel}|${size}|${car}`.toLowerCase().replace(/[\s\-]/g, "");
};

(async () => {
  const filePath = path.resolve(FILE);
  const wb = XLSX.readFile(filePath);
  const sheetName = flags.get("sheet") || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.log(`Sheet "${sheetName}" not found. Sheets: ${wb.SheetNames.join(", ")}`);
    process.exit(1);
  }

  const colIdx = (letter: string) => XLSX.utils.decode_col(letter);
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });

  const parsed: Parsed[] = [];
  const rejected: Rejected[] = [];
  const seenInFile = new Set<string>();
  let duplicatesInFile = 0;

  rows.forEach((r, i) => {
    if (i === 0) return; // header
    const desc = String(r[colIdx(DESC_COL)] ?? "").trim();
    if (!desc) return;
    const result = parseDescription(
      i + 1,
      desc,
      String(r[colIdx(CAR_COL)] ?? ""),
      String(r[colIdx(RFT_COL)] ?? ""),
    );
    if ("reason" in result) {
      rejected.push(result);
      return;
    }
    const key = dedupKey(result.model, result.size, result.car);
    if (seenInFile.has(key)) {
      duplicatesInFile++;
      return;
    }
    seenInFile.add(key);
    parsed.push(result);
  });

  // Compare with the database
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(TyreDetails);
  const existing = await repo.find();
  const existingKeys = new Set(existing.map((e) => dedupKey(e.modelName, e.size, e.manufacturerName)));
  const existingModels = new Set(existing.map((e) => e.modelName));

  const toInsert = parsed.filter((p) => !existingKeys.has(dedupKey(p.model, p.size, p.car)));
  const alreadyThere = parsed.length - toInsert.length;

  // Informational: database rows that do not appear in this file at all
  const fileKeys = new Set(parsed.map((p) => dedupKey(p.model, p.size, p.car)));
  const dbOnly = existing.filter((e) => !fileKeys.has(dedupKey(e.modelName, e.size, e.manufacturerName)));

  // ── Report ──
  console.log(`\nFile: ${filePath}  (sheet "${sheetName}")`);
  console.log(`Excel rows with a description : ${parsed.length + rejected.length + duplicatesInFile}`);
  console.log(`  parsed OK                   : ${parsed.length}`);
  console.log(`  duplicate inside the file   : ${duplicatesInFile}`);
  console.log(`  could not parse (skipped)   : ${rejected.length}`);
  console.log(`Already in database (skip)    : ${alreadyThere}`);
  console.log(`NEW rows to insert            : ${toInsert.length}`);
  if (dbOnly.length) {
    console.log(`\nFYI ${dbOnly.length} database rows are not in this file (left untouched):`);
    dbOnly.forEach((e) => console.log(`  id ${e.id}: ${e.modelName} | ${e.size} | ${e.manufacturerName}`));
  }

  const perModel: Record<string, number> = {};
  toInsert.forEach((p) => (perModel[p.model] = (perModel[p.model] || 0) + 1));
  console.log("\nNew rows per model:");
  console.table(
    Object.entries(perModel)
      .sort((a, b) => b[1] - a[1])
      .map(([model, n]) => ({
        model,
        newRows: n,
        imageAvailable: existingModels.has(model) ? "yes (propagate)" : "NO (needs fill/set)",
      })),
  );

  const perCar: Record<string, number> = {};
  toInsert.forEach((p) => (perCar[p.car] = (perCar[p.car] || 0) + 1));
  console.log("New rows per car:", JSON.stringify(perCar));

  console.log("\nPreview of first 15 new rows:");
  console.table(toInsert.slice(0, 15).map((p) => ({ excelRow: p.row, model: p.model, size: p.size, car: p.car })));

  const warned = toInsert.filter((p) => p.warnings.length);
  if (warned.length) {
    console.log(`\n${warned.length} new rows have warnings (still imported):`);
    warned.forEach((p) => console.log(`  row ${p.row}: ${p.warnings.join("; ")}  <- "${p.raw}"`));
  }

  if (rejected.length) {
    console.log(`\nSkipped rows (could not understand):`);
    rejected.forEach((r) => console.log(`  row ${r.row}: ${r.reason}  <- "${r.raw}"`));
  }

  const report = {
    file: filePath,
    sheet: sheetName,
    generatedAt: new Date().toISOString(),
    applied: APPLY,
    counts: {
      parsed: parsed.length,
      duplicatesInFile,
      rejected: rejected.length,
      alreadyInDb: alreadyThere,
      toInsert: toInsert.length,
    },
    toInsert: toInsert.map((p) => ({ excelRow: p.row, raw: p.raw, model: p.model, size: p.size, car: p.car, warnings: p.warnings })),
    rejected,
  };
  const reportPath = filePath.replace(/\.xlsx?$/i, "") + ".import-report.json";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${reportPath}`);

  // ── Insert ──
  if (!APPLY) {
    console.log("\nDRY RUN: nothing was written. Re-run with --apply to insert the new rows.");
  } else if (toInsert.length) {
    const entities = toInsert.map((p) =>
      repo.create({
        manufacturerName: p.car,
        modelName: p.model,
        brandName: BRAND,
        size: p.size,
        category: CATEGORY,
      }),
    );
    // chunked so a 450-row file never produces one giant statement
    let inserted = 0;
    for (let i = 0; i < entities.length; i += 100) {
      const chunk = entities.slice(i, i + 100);
      await repo.save(chunk);
      inserted += chunk.length;
    }
    console.log(`\nInserted ${inserted} rows. Now run:  npm run images -- propagate   then   npm run images -- fill`);
  }

  await AppDataSource.destroy();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
