import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Originally added a `type` column and DROPPED + re-created `size`, which
 * wipes every tyre size and fails on a fresh database (the table does not
 * exist yet). The entity never used `type`, so this is now a no-op.
 * `tyre_details` is created by TyreDetailsColumns1792400000000.
 */
export class Init1779108957222 implements MigrationInterface {
  name = "Init1779108957222";

  public async up(): Promise<void> {
    // intentionally empty, see comment above
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // intentionally empty
  }
}
