import { MigrationInterface, QueryRunner } from 'typeorm';

/** Vincula cotizaciones a clientes registrados (customer_id). */
export class AddQuoteCustomer1794090000000 implements MigrationInterface {
  name = 'AddQuoteCustomer1794090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "importcore"."quotes"
      ADD COLUMN IF NOT EXISTS "customer_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "importcore"."quotes"
      ADD CONSTRAINT "fk_quotes_customer"
      FOREIGN KEY ("customer_id") REFERENCES "importcore"."customers"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "importcore"."quotes" DROP CONSTRAINT "fk_quotes_customer"`);
    await queryRunner.query(`ALTER TABLE "importcore"."quotes" DROP COLUMN "customer_id"`);
  }
}
