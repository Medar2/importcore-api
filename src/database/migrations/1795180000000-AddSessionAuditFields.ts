import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionAuditFields1795180000000 implements MigrationInterface {
  name = 'AddSessionAuditFields1795180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "security"."session" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "security"."session" ADD COLUMN IF NOT EXISTS "close_reason" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "security"."session" DROP COLUMN IF EXISTS "close_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "security"."session" DROP COLUMN IF EXISTS "closed_at"`,
    );
  }
}
