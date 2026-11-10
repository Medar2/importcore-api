import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Decimal } from 'decimal.js';
import { Quote } from '../../entities/quote.entity';
import type { QuoteItemBreakdown } from '../../presentation/dtos/quote-calculation-result.dto';

const money = (v: string | null | undefined) =>
  v == null ? '-' : `$${new Decimal(v).toDecimalPlaces(2).toString()}`;

/** Genera el PDF de cotizacion (M3). Diseno simple, legible en movil. */
@Injectable()
export class QuotePdfService {
  async generate(quote: Quote): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    const r = quote.calculationResult;
    this.header(doc, quote);
    this.totalsTable(doc, r.totals);
    this.itemsTable(doc, r.items);
    this.footer(doc, quote);

    doc.end();
    return done;
  }

  private header(doc: PDFKit.PDFDocument, quote: Quote): void {
    doc.fontSize(18).text('ImportCore RD', { align: 'center' });
    doc.fontSize(12).text('Cotizacion de Costo Landed', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9);
    doc.text(`Cotizacion: ${quote.quoteNumber}`);
    doc.text(`Fecha: ${quote.createdAt.toISOString().slice(0, 10)}`);
    if (quote.customerName) doc.text(`Cliente: ${quote.customerName}`);
    doc.text(`Estado: ${quote.status}`);
    if (quote.validUntil) doc.text(`Vigente hasta: ${quote.validUntil}`);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
  }

  private totalsTable(
    doc: PDFKit.PDFDocument,
    t: Record<string, string | undefined>,
  ): void {
    doc.fontSize(10).text('Resumen', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9);
    const rows: Array<[string, string]> = [
      ['CBM total', t.cbm ?? '-'],
      ['Peso (kg)', t.weightKg ?? '-'],
      ['FOB', money(t.fobUsd)],
      ['Flete', money(t.freightUsd)],
      ['Seguro', money(t.insuranceUsd)],
      ['CIF', money(t.cifUsd)],
      ['Gravamen', money(t.gravamenUsd)],
      ['Selectivo', money(t.selectivoUsd)],
      ['ITBIS', money(t.itbisUsd)],
    ];
    for (const [k, v] of rows) {
      doc.text(`${k}: ${v}`, { indent: 10 });
    }
    doc.moveDown(0.2);
    doc.fontSize(11).text(`Costo Landed: ${money(t.landedCostUsd)}`);
    if (t.customerPriceUsd) {
      doc.text(`Precio Cliente: ${money(t.customerPriceUsd)}`);
    }
    doc.moveDown(0.5);
  }

  private itemsTable(doc: PDFKit.PDFDocument, items: QuoteItemBreakdown[]): void {
    doc.fontSize(10).text('Detalle por partida', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8);
    const cols = [40, 200, 260, 320, 380, 460, 520];
    const head = ['Desc', 'Unid', 'CBM', 'FOB', 'CIF', 'Landed', '$/und'];
    head.forEach((h, i) => doc.text(h, cols[i], doc.y, { width: 55 }));
    doc.moveDown(0.4);
    for (const it of items) {
      const y = doc.y;
      const desc = (it.description ?? 'Item').slice(0, 30);
      doc.text(desc, cols[0], y, { width: 155 })
        .text(String(it.units), cols[1], y, { width: 55 })
        .text(it.cbm, cols[2], y, { width: 55 })
        .text(money(it.fobUsd), cols[3], y, { width: 55 })
        .text(money(it.cifUsd), cols[4], y, { width: 55 })
        .text(money(it.landedCostUsd), cols[5], y, { width: 55 })
        .text(money(it.unitLandedCostUsd), cols[6], y, { width: 55 });
      doc.y = y + 12;
      if (doc.y > 760) {
        doc.addPage();
        doc.y = 50;
      }
    }
    doc.moveDown(0.5);
  }

  private footer(doc: PDFKit.PDFDocument, quote: Quote): void {
    doc.fontSize(8).fillColor('gray');
    doc.text(
      'Este documento es una cotizacion referencial. Los aranceles y tasas aplicadas son los vigentes al momento del calculo.',
      40,
      doc.y,
      { width: 515, align: 'center' },
    );
  }
}
