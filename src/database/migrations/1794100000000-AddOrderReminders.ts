import { MigrationInterface, QueryRunner } from 'typeorm';

/** Recordatorios de saldo CxC (M7), únicos por pedido y disparador. */
export class AddOrderReminders1794100000000 implements MigrationInterface {
  name = 'AddOrderReminders1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "importcore"."order_reminders" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "trigger" character varying(30) NOT NULL,
        "channel" character varying(20) NOT NULL DEFAULT 'EMAIL',
        "recipient" character varying(200),
        "balance_usd" numeric(14,4) NOT NULL,
        CONSTRAINT "PK_order_reminders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_order_reminders_order_trigger"
      ON "importcore"."order_reminders" ("order_id", "trigger")
    `);
    await queryRunner.query(`
      ALTER TABLE "importcore"."order_reminders"
      ADD CONSTRAINT "FK_order_reminders_order"
      FOREIGN KEY ("order_id") REFERENCES "importcore"."orders"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "importcore"."order_reminders" DROP CONSTRAINT "FK_order_reminders_order"`);
    await queryRunner.query(`DROP INDEX "importcore"."IDX_order_reminders_order_trigger"`);
    await queryRunner.query(`DROP TABLE "importcore"."order_reminders"`);
  }
}
