import { Decimal } from 'decimal.js';
import type { ReminderTrigger } from '../../domain/balance-reminder.policy';

export interface BalanceReminderData {
  customerName: string;
  orderNumber: string;
  containerNumber: string;
  balanceUsd: string;
  totalUsd: string;
  trigger: ReminderTrigger;
  eta: string | null;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const money = (v: string) =>
  new Decimal(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function balanceReminderSubject(d: BalanceReminderData): string {
  return d.trigger === 'PORT_ARRIVED'
    ? `Su pedido ${d.orderNumber} llegó a puerto — saldo pendiente`
    : `Su pedido ${d.orderNumber} llega pronto — saldo pendiente`;
}

export function balanceReminderHtml(d: BalanceReminderData): string {
  const status =
    d.trigger === 'PORT_ARRIVED'
      ? `El contenedor <b>${escape(d.containerNumber)}</b> ya llegó a puerto en República Dominicana.`
      : `El contenedor <b>${escape(d.containerNumber)}</b> tiene llegada estimada el <b>${escape(d.eta ?? '')}</b>.`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <h2 style="margin:0 0 12px">Todo Import RD</h2>
      <p>Hola <b>${escape(d.customerName)}</b>,</p>
      <p>${status}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#64748b">Pedido</td><td style="text-align:right"><b>${escape(d.orderNumber)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Total</td><td style="text-align:right">US$ ${money(d.totalUsd)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Saldo pendiente</td><td style="text-align:right;color:#b91c1c"><b>US$ ${money(d.balanceUsd)}</b></td></tr>
      </table>
      <p>Para liberar la entrega de su mercancía, el saldo debe estar saldado.
      Si ya realizó el pago, por favor envíenos el comprobante.</p>
    </div>
  `;
}
