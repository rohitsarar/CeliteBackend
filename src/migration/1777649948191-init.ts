import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1777649948191 implements MigrationInterface {
    name = 'Init1777649948191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`manufacturers\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, UNIQUE INDEX \`IDX_379a6015606c983f18c0b03e9e\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`brands\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, UNIQUE INDEX \`IDX_96db6bbbaa6f23cad26871339b\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`models\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`manufacturer_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tyre_details\` (\`id\` int NOT NULL AUTO_INCREMENT, \`manufacturer_id\` int NOT NULL, \`model_id\` int NOT NULL, \`brand_id\` int NOT NULL, \`size\` varchar(50) NOT NULL, \`image_url\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`tyre_details\``);
        await queryRunner.query(`DROP TABLE \`models\``);
        await queryRunner.query(`DROP INDEX \`IDX_96db6bbbaa6f23cad26871339b\` ON \`brands\``);
        await queryRunner.query(`DROP TABLE \`brands\``);
        await queryRunner.query(`DROP INDEX \`IDX_379a6015606c983f18c0b03e9e\` ON \`manufacturers\``);
        await queryRunner.query(`DROP TABLE \`manufacturers\``);
    }

}
