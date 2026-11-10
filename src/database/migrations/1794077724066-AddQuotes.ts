import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuotes1794077724066 implements MigrationInterface {
    name = 'AddQuotes1794077724066'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "importcore"."quotes" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quote_number" character varying(30) NOT NULL, "customer_name" character varying(200), "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "currency" character varying(3) NOT NULL DEFAULT 'USD', "request_snapshot" jsonb NOT NULL, "calculation_result" jsonb NOT NULL, "landed_cost_usd" numeric(14,4) NOT NULL, "customer_price_usd" numeric(14,4), "valid_until" date, CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0fe91de257e744a53b519b41a9" ON "importcore"."quotes" ("quote_number") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "importcore"."IDX_0fe91de257e744a53b519b41a9"`);
        await queryRunner.query(`DROP TABLE "importcore"."quotes"`);
    }

}
