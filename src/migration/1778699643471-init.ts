import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1778699643471 implements MigrationInterface {
    name = 'Init1778699643471'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tyre_details\` CHANGE \`brand_name\` \`brand_name\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tyre_details\` CHANGE \`brand_name\` \`brand_name\` varchar(255) NOT NULL`);
    }

}
