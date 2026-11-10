import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrders1794078751143 implements MigrationInterface {
    name = 'AddOrders1794078751143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "importcore"."orders" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_number" character varying(30) NOT NULL, "customer_id" uuid NOT NULL, "quote_id" uuid, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "currency" character varying(3) NOT NULL DEFAULT 'USD', "total_usd" numeric(14,4) NOT NULL, "items_snapshot" jsonb, "notes" text, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_75eba1c6b1a66b09f2a97e6927" ON "importcore"."orders" ("order_number") `);
        await queryRunner.query(`CREATE TABLE "importcore"."order_payments" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "amount" numeric(14,4) NOT NULL, "amount_usd" numeric(14,4) NOT NULL, "exchange_rate" numeric(14,6), "method" character varying(20) NOT NULL DEFAULT 'TRANSFER', "reference" character varying(100), "paid_at" date NOT NULL, "notes" text, CONSTRAINT "PK_bc14b014a69d39c7bbc4a154b69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5d2ebca202f9d9370a001a571b" ON "importcore"."order_payments" ("order_id") `);
        await queryRunner.query(`ALTER TABLE "importcore"."tariff_headings" ALTER COLUMN "itbis_rate" SET DEFAULT '0.18'`);
        await queryRunner.query(`ALTER TABLE "importcore"."orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "importcore"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "importcore"."orders" ADD CONSTRAINT "FK_d6183642a34a405848c4926c116" FOREIGN KEY ("quote_id") REFERENCES "importcore"."quotes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "importcore"."order_payments" ADD CONSTRAINT "FK_5d2ebca202f9d9370a001a571ba" FOREIGN KEY ("order_id") REFERENCES "importcore"."orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "importcore"."order_payments" DROP CONSTRAINT "FK_5d2ebca202f9d9370a001a571ba"`);
        await queryRunner.query(`ALTER TABLE "importcore"."orders" DROP CONSTRAINT "FK_d6183642a34a405848c4926c116"`);
        await queryRunner.query(`ALTER TABLE "importcore"."orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`);
        await queryRunner.query(`ALTER TABLE "importcore"."tariff_headings" ALTER COLUMN "itbis_rate" SET DEFAULT 0.18`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_5d2ebca202f9d9370a001a571b"`);
        await queryRunner.query(`DROP TABLE "importcore"."order_payments"`);
        await queryRunner.query(`DROP INDEX "importcore"."IDX_75eba1c6b1a66b09f2a97e6927"`);
        await queryRunner.query(`DROP TABLE "importcore"."orders"`);
    }

}
