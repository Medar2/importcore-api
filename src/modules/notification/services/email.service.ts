import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { SystemConfig } from '../../config/entities/system-config.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Envía un email genérico o factura
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const config = await this.resolveEmailConfig();
    if (!config.enabled) {
      this.logger.debug(`Email deshabilitado, omitiendo envío hacia ${to}`);
      return;
    }

    this.logger.log(`Enviando email hacia ${to}: ${subject}`);

    if (config.host) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.user
            ? { user: config.user, pass: config.pass }
            : undefined,
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from: `"${config.from.includes('@') ? config.from.split('@')[0] : 'Sistema'}" <${config.from}>`,
          to,
          subject,
          html,
        });

        this.logger.log(`[SMTP SUCCESS] Correo enviado exitosamente a ${to}`);
        return;
      } catch (err: any) {
        this.logger.error(
          `[SMTP ERROR] Fallo al enviar correo hacia ${to}: ${err.message}`,
        );
      }
    }

    // Fallback log
    this.logger.debug(`[MOCK EMAIL DISPATCH] Sent to ${to}: ${subject}`);
  }

  /**
   * Envía una notificación de seguridad por email
   */
  async sendSecurityNotification(
    to: string,
    subject: string,
    _message: string,
  ): Promise<void> {
    await this.sendEmail(to, subject, _message);
  }

  /**
   * Envía email de verificación de cuenta
   */
  async sendVerificationEmail(
    to: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get('APP_URL')}/verify?token=${verificationToken}`;

    await this.sendSecurityNotification(
      to,
      'Verifica tu cuenta',
      `Haz clic en el siguiente enlace para verificar tu cuenta: ${verificationUrl}`,
    );
  }

  /**
   * Envía email de recuperación de contraseña con plantilla HTML profesional
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName?: string,
  ): Promise<void> {
    const baseUrl =
      this.configService.get('FRONTEND_URL') ||
      this.configService.get('APP_URL') ||
      'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>Restablecer Contraseña</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Restablecimiento de Contraseña</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Sistema de Gestión RBAC & Facturación</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; font-size: 15px;">Hola <strong>${userName || 'Usuario'}</strong>,</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.5;">
              Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta. Para definir una nueva contraseña, haz clic en el siguiente botón:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                Restablecer mi Contraseña
              </a>
            </div>
            <p style="margin: 0 0 12px; font-size: 12px; color: #64748b;">
              ⏱️ <em>Este enlace es válido durante 2 horas. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</em>
            </p>
            <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 20px; font-size: 11px; color: #94a3b8; word-break: break-all;">
              Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
              <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(
      to,
      '🔐 Restablecimiento de Contraseña - Sistema RBAC',
      html,
    );
  }

  /**
   * Envía email de alerta de seguridad
   */
  async sendSecurityAlert(
    to: string,
    alertType: string,
    details: string,
  ): Promise<void> {
    await this.sendSecurityNotification(
      to,
      `Alerta de seguridad: ${alertType}`,
      details,
    );
  }

  private async resolveEmailConfig() {
    try {
      const repo = this.dataSource.getRepository(SystemConfig);
      const host =
        (await repo.findOne({ where: { key: 'EMAIL.HOST' } }))?.value ||
        this.configService.get('SMTP_HOST');
      const portRaw =
        (await repo.findOne({ where: { key: 'EMAIL.PORT' } }))?.value ||
        this.configService.get('SMTP_PORT') ||
        '587';
      const port = parseInt(portRaw, 10);
      const user =
        (await repo.findOne({ where: { key: 'EMAIL.USER' } }))?.value ||
        this.configService.get('SMTP_USER');
      const pass =
        (await repo.findOne({ where: { key: 'EMAIL.PASS' } }))?.value ||
        this.configService.get('SMTP_PASS');
      const from =
        (await repo.findOne({ where: { key: 'EMAIL.FROM' } }))?.value ||
        this.configService.get('EMAIL_FROM') ||
        'noreply@security.local';
      const secureRaw =
        (await repo.findOne({ where: { key: 'EMAIL.SECURE' } }))?.value ||
        'false';
      const enabledRaw =
        (await repo.findOne({ where: { key: 'EMAIL.ENABLED' } }))?.value ||
        this.configService.get('EMAIL_ENABLED') ||
        'true';

      return {
        host,
        port,
        user,
        pass,
        from,
        secure: secureRaw === 'true' || port === 465,
        enabled: enabledRaw === 'true',
      };
    } catch {
      return {
        host: this.configService.get('SMTP_HOST'),
        port: parseInt(this.configService.get('SMTP_PORT') || '587', 10),
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
        from: this.configService.get('EMAIL_FROM') || 'noreply@security.local',
        secure: false,
        enabled: this.configService.get('EMAIL_ENABLED') === 'true',
      };
    }
  }
}
