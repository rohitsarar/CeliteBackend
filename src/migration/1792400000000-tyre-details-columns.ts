import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * Brings `tyre_details` in line with the TyreDetails entity.
 *
 * Earlier migrations were generated against a different database and were
 * never committed, so this migration is deliberately defensive: every change
 * is guarded by a hasColumn() check and is a no-op when the column already
 * exists. It is safe to run against the live database.
 */
export class TyreDetailsColumns1792400000000 implements MigrationInterface {
  name = "TyreDetailsColumns1792400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = "tyre_details";

    if (!(await queryRunner.hasTable(table))) {
      await queryRunner.query(`
        CREATE TABLE \`${table}\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`manufacturer_name\` varchar(255) NOT NULL,
          \`model_name\` varchar(255) NOT NULL,
          \`brand_name\` varchar(255) NULL,
          \`size\` varchar(255) NOT NULL,
          \`category\` varchar(50) NOT NULL DEFAULT 'OTHERS',
          \`image_url\` text NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_tyre_manufacturer\` (\`manufacturer_name\`),
          INDEX \`idx_tyre_category\` (\`category\`)
        ) ENGINE=InnoDB
      `);
      return;
    }

    if (!(await queryRunner.hasColumn(table, "brand_name"))) {
      await queryRunner.addColumn(
        table,
        new TableColumn({ name: "brand_name", type: "varchar", length: "255", isNullable: true }),
      );
    }

    if (!(await queryRunner.hasColumn(table, "category"))) {
      await queryRunner.addColumn(
        table,
        new TableColumn({
          name: "category",
          type: "varchar",
          length: "50",
          isNullable: false,
          default: "'OTHERS'",
        }),
      );
    }

    if (!(await queryRunner.hasColumn(table, "image_url"))) {
      await queryRunner.addColumn(
        table,
        new TableColumn({ name: "image_url", type: "text", isNullable: true }),
      );
    }

    // Indexes used by the public filter endpoints
    const existing = await queryRunner.getTable(table);
    const hasIndex = (name: string) => existing?.indices.some((i) => i.name === name);

    if (!hasIndex("idx_tyre_manufacturer")) {
      await queryRunner.query(
        `CREATE INDEX \`idx_tyre_manufacturer\` ON \`${table}\` (\`manufacturer_name\`)`,
      );
    }
    if (!hasIndex("idx_tyre_category")) {
      await queryRunner.query(
        `CREATE INDEX \`idx_tyre_category\` ON \`${table}\` (\`category\`)`,
      );
    }

    if (!(await queryRunner.hasTable("user"))) {
      await queryRunner.query(`
        CREATE TABLE \`user\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`FullName\` varchar(255) NULL,
          \`contactNumber\` varchar(255) NULL,
          \`email\` varchar(255) NULL,
          \`lastUserSession\` varchar(255) NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only the indexes are reverted; dropping data columns on rollback is
    // more dangerous than leaving them in place.
    await queryRunner.query(`DROP INDEX \`idx_tyre_category\` ON \`tyre_details\``);
    await queryRunner.query(`DROP INDEX \`idx_tyre_manufacturer\` ON \`tyre_details\``);
  }
}
