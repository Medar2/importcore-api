import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchases1794079000000 implements MigrationInterface {
    name = 'AddPurchases1794079000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "importcore"."purchase_orders" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "po_number" character varying(30) NOT NULL, "vendor_id" uuid NOT NULL, "order_id" uuid, "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "currency" character varying(3) NOT NULL DEFAULT 'USD', "total_usd" numeric(14,4) NOT NULL DEFAULT '0', "items_snapshot" jsonb, "expected_date" date, "notes" text, CONSTRAINT "PK_po" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_po_number" ON "importcore"."purchase_orders" ("po_number") `);
        await queryRunner.query(`CREATE TABLE "importcore"."purchase_payments" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purchase_order_id" uuid NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "amount" numeric(14,4) NOT NULL, "amount_usd" numeric(14,4) NOT NULL, "exchange_rate" numeric(14,6), "method" character varying(20) NOT NULL DEFAULT 'TRANSFER', "reference" character varying(100), "paid_at" date NOT NULL, "notes" text, CONSTRAINT "PK_pp" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_pp_po" ON "importcore"."purchase_payments" ("purchase_order_id") `);
        await queryRunner.query(`ALTER TABLE "importcore"."purchase_orders" ADD CONSTRAINT "FK_po_vendor" FOREIGN KEY ("vendor_id") REFERENCES "importcore"."vendors"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "importcore"."purchase_orders" ADD CONSTRAINT "FK_po_order" FOREIGN KEY ("order_id") REFERENCES "importcore"."orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "importcore"."purchase_payments" ADD CONSTRAINT "FK_pp_po" FOREIGN KEY ("purchase_order_id") REFERENCES "importcore"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "importcore"."purchase_payments" DROP CONSTRAINT "FK_pp_po"`);
        await queryRunner.query(`ALTER TABLE "importcore"."purchase_orders" DROP CONSTRAINT "FK_po_order"`);
        await queryRunner.query(`ALTER TABLE "importcore"."purchase_orders" DROP CONSTRAINT "FK_po_vendor"`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_pp_po"`);
        await queryRunner.query(`DROP TABLE "importcore"."purchase_payments"`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_po_number"`);
        await queryRunner.query(`DROP TABLE "importcore"."purchase_orders"`);
    }

}
