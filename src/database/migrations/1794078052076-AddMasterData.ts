import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMasterData1794078052076 implements MigrationInterface {
    name = 'AddMasterData1794078052076'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "importcore"."vendors" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "trade_name" character varying(200), "country_code" character varying(2) NOT NULL DEFAULT 'CN', "contact" character varying(50), "phone" character varying(20), "email" character varying(200), "address" text, "payment_terms" character varying(100), "notes" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9c956c9797edfae5c6ddacc4e6e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_04d426b73aeaf5f59420bee11e" ON "importcore"."vendors" ("is_active") `);
        await queryRunner.query(`CREATE TABLE "importcore"."tariff_headings" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hs_code" character varying(20) NOT NULL, "description" character varying(300) NOT NULL, "gravamen_rate" numeric(8,4) NOT NULL DEFAULT '0', "itbis_rate" numeric(8,4) NOT NULL DEFAULT '0.18', "selectivo_rate" numeric(8,4) NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_47210fe4b39c0c1c8fd140823a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_84616a03fa5f29329adfd77f32" ON "importcore"."tariff_headings" ("hs_code") `);
        await queryRunner.query(`CREATE TABLE "importcore"."products" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sku" character varying(60) NOT NULL, "description" character varying(300) NOT NULL, "vendor_id" uuid, "tariff_heading_id" uuid, "units_per_box" integer NOT NULL, "boxes_per_pallet" integer, "box_length_m" numeric(10,4) NOT NULL, "box_width_m" numeric(10,4) NOT NULL, "box_height_m" numeric(10,4) NOT NULL, "box_gross_weight_kg" numeric(10,4), "unit_fob_price_usd" numeric(14,4), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c44ac33a05b144dd0d9ddcf932" ON "importcore"."products" ("sku") `);
        await queryRunner.query(`CREATE TABLE "importcore"."customers" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "tax_id" character varying(20) NOT NULL, "customer_type" character varying(20) NOT NULL DEFAULT 'NACIONAL', "phone" character varying(20), "email" character varying(200), "address" character varying(300), "notes" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6a1d20a1ca90c48dd400d9a2a6" ON "importcore"."customers" ("tax_id") `);
        await queryRunner.query(`ALTER TABLE "importcore"."products" ADD CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d" FOREIGN KEY ("vendor_id") REFERENCES "importcore"."vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "importcore"."products" ADD CONSTRAINT "FK_849e0c896a861d403a398f7f3c2" FOREIGN KEY ("tariff_heading_id") REFERENCES "importcore"."tariff_headings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "importcore"."products" DROP CONSTRAINT "FK_849e0c896a861d403a398f7f3c2"`);
        await queryRunner.query(`ALTER TABLE "importcore"."products" DROP CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d"`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_6a1d20a1ca90c48dd400d9a2a6"`);
        await queryRunner.query(`DROP TABLE "importcore"."customers"`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_c44ac33a05b144dd0d9ddcf932"`);
        await queryRunner.query(`DROP TABLE "importcore"."products"`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_84616a03fa5f29329adfd77f32"`);
        await queryRunner.query(`DROP TABLE "importcore"."tariff_headings"`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_04d426b73aeaf5f59420bee11e"`);
        await queryRunner.query(`DROP TABLE "importcore"."vendors"`);
    }

}
