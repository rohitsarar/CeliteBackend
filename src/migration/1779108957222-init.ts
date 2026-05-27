import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1779108957222 implements MigrationInterface {
    name = 'Init1779108957222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`type\` varchar(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`size\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`size\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`size\``);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` ADD \`size\` varchar(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`tyre_details\` DROP COLUMN \`type\``);
    }

}
