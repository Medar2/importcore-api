import { MigrationInterface, QueryRunner } from 'typeorm';

/** Asignacion de cotizaciones y pedidos a contenedores existentes (consolidacion). */
export class AddContainerAssignments1794080000000 implements MigrationInterface {
  name = 'AddContainerAssignments1794080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "importcore"."quotes"
      ADD COLUMN IF NOT EXISTS "container_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "importcore"."quotes"
      ADD CONSTRAINT "fk_quotes_container"
      FOREIGN KEY ("container_id") REFERENCES "importcore"."containers"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "importcore"."orders"
      ADD COLUMN IF NOT EXISTS "container_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "importcore"."orders"
      ADD CONSTRAINT "fk_orders_container"
      FOREIGN KEY ("container_id") REFERENCES "importcore"."containers"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "importcore"."orders" DROP CONSTRAINT "fk_orders_container"`);
    await queryRunner.query(`ALTER TABLE "importcore"."orders" DROP COLUMN "container_id"`);
    await queryRunner.query(`ALTER TABLE "importcore"."quotes" DROP CONSTRAINT "fk_quotes_container"`);
    await queryRunner.query(`ALTER TABLE "importcore"."quotes" DROP COLUMN "container_id"`);
  }
}
