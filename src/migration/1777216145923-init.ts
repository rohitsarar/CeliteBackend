import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1777216145923 implements MigrationInterface {
    name = 'Init1777216145923'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`FullName\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`FullName\``);
    }

}
