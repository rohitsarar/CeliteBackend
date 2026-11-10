import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

/**
 * Adds `is_active` to `tyre_details` so the admin can hide a tyre from the
 * website without deleting it. Existing rows stay visible (default 1).
 */
export class TyreDetailsActive1792600000000 implements MigrationInterface {
  name = "TyreDetailsActive1792600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = "tyre_details";
    if (!(await queryRunner.hasColumn(table, "is_active"))) {
      await queryRunner.addColumn(
        table,
        new TableColumn({ name: "is_active", type: "tinyint", width: 1, isNullable: false, default: 1 }),
      );
      await queryRunner.createIndex(
        table,
        new TableIndex({ name: "idx_tyre_is_active", columnNames: ["is_active"] }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = "tyre_details";
    if (await queryRunner.hasColumn(table, "is_active")) {
      await queryRunner.dropIndex(table, "idx_tyre_is_active").catch(() => undefined);
      await queryRunner.dropColumn(table, "is_active");
    }
  }
}
