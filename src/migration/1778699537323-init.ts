import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1778699537323 implements MigrationInterface {
    name = 'Init1778699537323'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`brand_id\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`manufacturer_id\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`model_id\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`manufacturer_name\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`model_name\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`brand_name\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`brand_name\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`model_name\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`manufacturer_name\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`model_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`manufacturer_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`brand_id\` int NOT NULL`);
    }

}
