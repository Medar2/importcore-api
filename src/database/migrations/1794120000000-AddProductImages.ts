import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImages1794120000000 implements MigrationInterface {
  name = 'AddProductImages1794120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "importcore"."products" ADD COLUMN IF NOT EXISTS "image_urls" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "importcore"."products" DROP COLUMN IF EXISTS "image_urls"`,
    );
  }
}
