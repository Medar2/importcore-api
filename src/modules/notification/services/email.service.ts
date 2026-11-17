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
    const rawBaseUrl =
      this.configService.get('FRONTEND_URL') ||
      this.configService.get('APP_URL') ||
      'http://localhost:3000';
    const baseUrl = rawBaseUrl.replace(/\\/g, '/').replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const companyName =
      this.configService.get('COMPANY_NAME') || 'ImportCore RD';
    const currentYear = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer Contraseña - ${companyName}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f1e33;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7fb; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 45, 98, 0.08), 0 8px 10px -6px rgba(0, 45, 98, 0.05); border: 1px solid #dbe4f0;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #002d62 0%, #0a192f 100%); padding: 36px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); padding: 10px; border-radius: 12px; margin-bottom: 12px;">
                      <span style="font-size: 28px; line-height: 1;">🔐</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">${companyName}</h1>
                    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; font-weight: 400; letter-spacing: 0.05em; text-transform: uppercase;">Seguridad y Control de Acceso</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="margin: 0 0 16px 0; color: #0f1e33; font-size: 18px; font-weight: 600;">Restablecimiento de Contraseña</h2>
                    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                      Hola <strong>${userName || 'Usuario'}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                      Hemos recibido una solicitud para restablecer la contraseña de acceso asociada a tu cuenta. Para elegir una nueva contraseña y recuperar tu acceso, haz clic en el siguiente botón:
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #002d62; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 45, 98, 0.25); border: 1px solid #002d62;">
                            Restablecer mi Contraseña
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Details Card -->
                    <div style="background-color: #f8fafc; border-radius: 10px; padding: 16px 20px; border-left: 4px solid #0057b8; margin: 24px 0;">
                      <p style="margin: 0 0 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">
                        ⏱️ Validez del enlace: 2 horas
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                        Por tu seguridad, este enlace expirará automáticamente. Si no solicitaste este cambio, puedes ignorar este mensaje; tu contraseña actual continuará siendo segura.
                      </p>
                    </div>

                    <!-- Direct Link Fallback -->
                    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                        ¿El botón no responde? Copia y pega la siguiente URL en tu navegador:
                      </p>
                      <p style="margin: 0; font-size: 12px; line-height: 1.4; word-break: break-all;">
                        <a href="${resetUrl}" style="color: #0057b8; text-decoration: underline;">${resetUrl}</a>
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #dbe4f0;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 500;">
                      © ${currentYear} ${companyName} — Todos los derechos reservados.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      Este es un correo electrónico automatizado enviado por el sistema de seguridad. Por favor no respondas a este remitente.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail(
      to,
      `🔐 Restablecer contraseña — ${companyName}`,
      html,
    );
  }

  /**
   * Envía confirmación de que la contraseña ha sido cambiada exitosamente
   */
  async sendPasswordChangedConfirmationEmail(
    to: string,
    userName?: string,
  ): Promise<void> {
    const rawBaseUrl =
      this.configService.get('FRONTEND_URL') ||
      this.configService.get('APP_URL') ||
      'http://localhost:3000';
    const baseUrl = rawBaseUrl.replace(/\\/g, '/').replace(/\/+$/, '');
    const loginUrl = `${baseUrl}/login`;
    const companyName =
      this.configService.get('COMPANY_NAME') || 'ImportCore RD';
    const currentYear = new Date().getFullYear();
    const formattedDate = new Date().toLocaleString('es-DO', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contraseña Actualizada - ${companyName}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f1e33;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7fb; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 45, 98, 0.08), 0 8px 10px -6px rgba(0, 45, 98, 0.05); border: 1px solid #dbe4f0;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #002d62 0%, #0a192f 100%); padding: 36px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(34, 197, 94, 0.2); padding: 10px; border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(34, 197, 94, 0.4);">
                      <span style="font-size: 28px; line-height: 1;">✅</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">${companyName}</h1>
                    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; font-weight: 400; letter-spacing: 0.05em; text-transform: uppercase;">Notificación de Seguridad</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="margin: 0 0 16px 0; color: #0f1e33; font-size: 18px; font-weight: 600;">Contraseña Actualizada con Éxito</h2>
                    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                      Hola <strong>${userName || 'Usuario'}</strong>,
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                      Te confirmamos que la contraseña de tu cuenta en <strong>${companyName}</strong> ha sido restablecida y actualizada correctamente.
                    </p>

                    <!-- Info Box -->
                    <div style="background-color: #f0fdf4; border-radius: 10px; padding: 16px 20px; border-left: 4px solid #16a34a; margin: 20px 0;">
                      <p style="margin: 0 0 6px 0; font-size: 13px; color: #166534; font-weight: 600;">
                        ✓ Acción confirmada
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.5;">
                        <strong>Fecha del cambio:</strong> ${formattedDate}
                      </p>
                    </div>

                    <!-- Security Alert Box -->
                    <div style="background-color: #fff7ed; border-radius: 10px; padding: 16px 20px; border-left: 4px solid #ea580c; margin: 20px 0;">
                      <p style="margin: 0 0 6px 0; font-size: 13px; color: #9a3412; font-weight: 600;">
                        🛡️ Medidas de seguridad aplicadas
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #c2410c; line-height: 1.5;">
                        Por precaución, todas las sesiones abiertas en tus dispositivos anteriores han sido finalizadas. Si tú realizaste este cambio, puedes iniciar sesión nuevamente con tu nueva clave.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #b45309; line-height: 1.4;">
                        <strong>¿No reconoces esta actividad?</strong> Si no realizaste este cambio, ponte en contacto inmediato con el administrador del sistema para proteger tu cuenta.
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 10px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #002d62; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 45, 98, 0.25); border: 1px solid #002d62;">
                            Iniciar Sesión en ImportCore
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #dbe4f0;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 500;">
                      © ${currentYear} ${companyName} — Todos los derechos reservados.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      Este es un correo automatizado de seguridad. Por favor no respondas a este mensaje.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail(
      to,
      `✅ Contraseña actualizada exitosamente — ${companyName}`,
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
        this.configService.get('SMTP_FROM') ||
        this.configService.get('EMAIL_FROM') ||
        'noreply@importcore.local';
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
        from:
          this.configService.get('SMTP_FROM') ||
          this.configService.get('EMAIL_FROM') ||
          'noreply@importcore.local',
        secure: false,
        enabled: this.configService.get('EMAIL_ENABLED') === 'true',
      };
    }
  }
}
