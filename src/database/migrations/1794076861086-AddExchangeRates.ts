import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExchangeRates1794076861086 implements MigrationInterface {
    name = 'AddExchangeRates1794076861086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "importcore"`);
        await queryRunner.query(`CREATE TABLE "importcore"."exchange_rates" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "base_currency" character varying(3) NOT NULL, "quote_currency" character varying(3) NOT NULL, "rate" numeric(14,6) NOT NULL, "effective_date" date NOT NULL, "source" character varying(50) NOT NULL DEFAULT 'MANUAL', CONSTRAINT "PK_33a614bad9e61956079d817ebe2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c9f503f3582910333d6817a328" ON "importcore"."exchange_rates" ("base_currency", "quote_currency", "effective_date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "importcore"."exchange_rates"`);
        await queryRunner.query(`DROP SCHEMA IF EXISTS "importcore" CASCADE`);
    }

}
