import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Adds the product-page content columns to `tyre_details`:
 * description (text), highlights (json array) and specs (json array).
 * Guarded with hasColumn() so it is safe to run more than once.
 * Fill them afterwards with `npm run tyre-details -- --apply`.
 */
export class TyreDetailsContent1792500000000 implements MigrationInterface {
  name = "TyreDetailsContent1792500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = "tyre_details";
    const columns = [
      new TableColumn({ name: "description", type: "text", isNullable: true }),
      new TableColumn({ name: "highlights", type: "json", isNullable: true }),
      new TableColumn({ name: "specs", type: "json", isNullable: true }),
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn(table, column.name))) {
        await queryRunner.addColumn(table, column);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = "tyre_details";
    for (const name of ["specs", "highlights", "description"]) {
      if (await queryRunner.hasColumn(table, name)) {
        await queryRunner.dropColumn(table, name);
      }
    }
  }
}
