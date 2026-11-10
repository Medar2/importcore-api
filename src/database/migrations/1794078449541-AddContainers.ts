import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContainers1794078449541 implements MigrationInterface {
    name = 'AddContainers1794078449541'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "importcore"."containers" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "container_number" character varying(20) NOT NULL, "container_type" character varying(10) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PLANNED', "seal_number" character varying(30), "bl_number" character varying(50), "etd" date, "eta" date, "ata" date, "demurrage_free_days" integer NOT NULL DEFAULT '4', "demurrage_daily_rate_usd" numeric(10,2) NOT NULL DEFAULT '0', "notes" text, CONSTRAINT "PK_21cbac3e68f7b1cf53d39cda70c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d215a4e1f8d1be24d123df3d9e" ON "importcore"."containers" ("container_number") `);
        await queryRunner.query(`ALTER TABLE "importcore"."tariff_headings" ALTER COLUMN "itbis_rate" SET DEFAULT '0.18'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "importcore"."tariff_headings" ALTER COLUMN "itbis_rate" SET DEFAULT 0.18`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_d215a4e1f8d1be24d123df3d9e"`);
        await queryRunner.query(`DROP TABLE "importcore"."containers"`);
    }

}
