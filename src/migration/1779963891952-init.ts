import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the `user` (leads) table if it does not exist yet.
 *
 * The original version also added a `type` column and DROPPED + re-created
 * `tyre_details.size`, which would wipe every tyre size. Those statements are
 * removed; the entity never used `type`. Safe to run on an existing database.
 */
export class Init1779963891952 implements MigrationInterface {
  name = "Init1779963891952";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE IF NOT EXISTS `user` (`id` int NOT NULL AUTO_INCREMENT, `FullName` varchar(255) NULL, `contactNumber` varchar(255) NULL, `email` varchar(255) NULL, `lastUserSession` varchar(255) NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  public async down(): Promise<void> {
    // Never drop the leads table automatically.
  }
}
