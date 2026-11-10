import { MigrationInterface, QueryRunner } from 'typeorm';

const AUDIT_COLS = `
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "created_by" character varying,
  "updated_by" character varying,
  "id" uuid NOT NULL DEFAULT uuid_generate_v4()`;

/** M8: secuencias e-NCF, comprobantes emitidos (607/608) y compras locales (606). */
export class AddFiscal1794110000000 implements MigrationInterface {
  name = 'AddFiscal1794110000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "importcore"."ncf_sequences" (${AUDIT_COLS},
        "ecf_type" character varying(2) NOT NULL,
        "current_number" bigint NOT NULL DEFAULT 0,
        "end_number" bigint NOT NULL,
        "expires_at" date,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_ncf_sequences" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ncf_sequences_range" CHECK ("current_number" >= 0 AND "current_number" <= "end_number")
      )`);
    await q.query(`
      CREATE UNIQUE INDEX "IDX_ncf_sequences_active_type"
      ON "importcore"."ncf_sequences" ("ecf_type") WHERE "is_active" = true`);

    await q.query(`
      CREATE TABLE "importcore"."fiscal_documents" (${AUDIT_COLS},
        "encf" character varying(13) NOT NULL,
        "ecf_type" character varying(2) NOT NULL,
        "issue_date" date NOT NULL,
        "order_id" uuid,
        "customer_id" uuid NOT NULL,
        "buyer_tax_id" character varying(20),
        "buyer_name" character varying(200) NOT NULL,
        "income_type" character varying(2) NOT NULL DEFAULT '01',
        "total_usd" numeric(14,4) NOT NULL,
        "exchange_rate" numeric(14,6) NOT NULL,
        "itbis_rate" numeric(8,4) NOT NULL,
        "subtotal_dop" numeric(14,4) NOT NULL,
        "itbis_dop" numeric(14,4) NOT NULL,
        "total_dop" numeric(14,4) NOT NULL,
        "payment_breakdown" jsonb NOT NULL,
        "status" character varying(20) NOT NULL,
        "provider" character varying(30) NOT NULL,
        "track_id" character varying(100),
        "security_code" character varying(20),
        "provider_message" text,
        "cancellation_type" character varying(2),
        "cancellation_reason" text,
        "cancelled_at" TIMESTAMP,
        CONSTRAINT "PK_fiscal_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fiscal_documents_order" FOREIGN KEY ("order_id")
          REFERENCES "importcore"."orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_fiscal_documents_customer" FOREIGN KEY ("customer_id")
          REFERENCES "importcore"."customers"("id") ON DELETE RESTRICT
      )`);
    await q.query(`CREATE UNIQUE INDEX "IDX_fiscal_documents_encf" ON "importcore"."fiscal_documents" ("encf")`);
    await q.query(`CREATE INDEX "IDX_fiscal_documents_issue_date" ON "importcore"."fiscal_documents" ("issue_date")`);
    await q.query(`CREATE INDEX "IDX_fiscal_documents_order" ON "importcore"."fiscal_documents" ("order_id")`);
    await q.query(`
      CREATE UNIQUE INDEX "IDX_fiscal_documents_one_valid_per_order"
      ON "importcore"."fiscal_documents" ("order_id")
      WHERE "order_id" IS NOT NULL AND "status" NOT IN ('CANCELLED', 'REJECTED')`);

    await q.query(`
      CREATE TABLE "importcore"."fiscal_purchases" (${AUDIT_COLS},
        "supplier_tax_id" character varying(11) NOT NULL,
        "supplier_tax_id_type" character varying(1) NOT NULL,
        "supplier_name" character varying(200) NOT NULL,
        "goods_services_type" character varying(2) NOT NULL,
        "ncf" character varying(13) NOT NULL,
        "modified_ncf" character varying(13),
        "invoice_date" date NOT NULL,
        "payment_date" date,
        "services_amount" numeric(14,4) NOT NULL DEFAULT 0,
        "goods_amount" numeric(14,4) NOT NULL DEFAULT 0,
        "itbis_billed" numeric(14,4) NOT NULL DEFAULT 0,
        "itbis_withheld" numeric(14,4) NOT NULL DEFAULT 0,
        "itbis_to_cost" numeric(14,4) NOT NULL DEFAULT 0,
        "isr_withholding_type" character varying(2),
        "isr_withheld" numeric(14,4) NOT NULL DEFAULT 0,
        "selective_tax" numeric(14,4) NOT NULL DEFAULT 0,
        "other_taxes" numeric(14,4) NOT NULL DEFAULT 0,
        "legal_tip" numeric(14,4) NOT NULL DEFAULT 0,
        "payment_method" character varying(2) NOT NULL,
        "purchase_order_id" uuid,
        "notes" text,
        CONSTRAINT "PK_fiscal_purchases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fiscal_purchases_po" FOREIGN KEY ("purchase_order_id")
          REFERENCES "importcore"."purchase_orders"("id") ON DELETE SET NULL
      )`);
    await q.query(`
      CREATE UNIQUE INDEX "IDX_fiscal_purchases_supplier_ncf"
      ON "importcore"."fiscal_purchases" ("supplier_tax_id", "ncf")`);
    await q.query(`CREATE INDEX "IDX_fiscal_purchases_invoice_date" ON "importcore"."fiscal_purchases" ("invoice_date")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "importcore"."fiscal_purchases"`);
    await q.query(`DROP TABLE "importcore"."fiscal_documents"`);
    await q.query(`DROP TABLE "importcore"."ncf_sequences"`);
  }
}
