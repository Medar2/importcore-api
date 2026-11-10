import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { SystemConfig } from '../entities/system-config.entity';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  BulkUpdateConfigDto,
  TestSmtpDto,
} from '../dto/system-config.dto';

const DEFAULT_EMAIL_SETTINGS = [
  {
    key: 'EMAIL.HOST',
    value: 'smtp.gmail.com',
    description: 'Servidor SMTP (ej. smtp.gmail.com, smtp.office365.com)',
    group: 'EMAIL',
  },
  {
    key: 'EMAIL.PORT',
    value: '587',
    description: 'Puerto SMTP (587 para TLS, 465 para SSL, 25)',
    group: 'EMAIL',
  },
  {
    key: 'EMAIL.USER',
    value: '',
    description: 'Usuario SMTP / Correo electrónico',
    group: 'EMAIL',
  },
  {
    key: 'EMAIL.PASS',
    value: '',
    description: 'Contraseña o App Password del correo',
    group: 'EMAIL',
  },
  {
    key: 'EMAIL.FROM',
    value: 'noreply@empresa.com',
    description: 'Dirección o nombre del remitente (From)',
    group: 'EMAIL',
  },
  {
    key: 'EMAIL.SECURE',
    value: 'false',
    description: 'Usar SSL directo (true para puerto 465, false para 587)',
    group: 'EMAIL',
  },
  {
    key: 'EMAIL.ENABLED',
    value: 'true',
    description: 'Habilitar o deshabilitar envío de correos',
    group: 'EMAIL',
  },
];

const DEFAULT_VALIDATION_SETTINGS = [
  {
    key: 'VALIDATION.CEDULA_DOMINICANA',
    value: 'true',
    description: 'Validar algoritmo de dígito verificador JCE en cédulas dominicanas',
    group: 'VALIDATION',
  },
];

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectRepository(SystemConfig)
    private configRepository: Repository<SystemConfig>,
  ) {}

  async create(createDto: CreateSystemConfigDto) {
    const config = this.configRepository.create(createDto);
    return this.configRepository.save(config);
  }

  async findAll() {
    await this.ensureDefaultEmailSettings();
    const all = await this.configRepository.find({
      order: { group: 'ASC', key: 'ASC' },
    });
    return all.filter((c) => !c.key.startsWith('SMTP.'));
  }

  async findByGroup(group: string) {
    return this.configRepository.find({ where: { group } });
  }

  async getValue(
    key: string,
    defaultValue?: string,
  ): Promise<string | undefined> {
    const config = await this.configRepository.findOne({ where: { key } });
    return config ? config.value : defaultValue;
  }

  async findByKey(key: string) {
    const config = await this.configRepository.findOne({ where: { key } });
    if (!config)
      throw new NotFoundException(`Config with key ${key} not found`);
    return config;
  }

  async update(key: string, updateDto: UpdateSystemConfigDto) {
    let config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      config = this.configRepository.create({ key, ...updateDto });
    } else {
      Object.assign(config, updateDto);
    }
    return this.configRepository.save(config);
  }

  async updateBulk(bulkDto: BulkUpdateConfigDto) {
    const results: SystemConfig[] = [];
    for (const item of bulkDto.settings) {
      const { key, ...data } = item;
      results.push(await this.update(key, data));
    }
    return results;
  }

  async testSmtpConnection(dto: TestSmtpDto) {
    // 1. Obtener valores del DTO o de la base de datos
    const host =
      dto.host || (await this.getValue('EMAIL.HOST')) || process.env.SMTP_HOST;
    const portRaw =
      dto.port !== undefined
        ? String(dto.port)
        : (await this.getValue('EMAIL.PORT')) || process.env.SMTP_PORT || '587';
    const port = parseInt(portRaw, 10);
    const user =
      dto.user !== undefined
        ? dto.user
        : (await this.getValue('EMAIL.USER')) || process.env.SMTP_USER;
    const pass =
      dto.pass !== undefined
        ? dto.pass
        : (await this.getValue('EMAIL.PASS')) || process.env.SMTP_PASS;
    const secureRaw =
      dto.secure !== undefined
        ? String(dto.secure)
        : (await this.getValue('EMAIL.SECURE')) || 'false';
    const secure = secureRaw === 'true' || port === 465;
    const from =
      dto.from ||
      (await this.getValue('EMAIL.FROM')) ||
      process.env.EMAIL_FROM ||
      user ||
      'noreply@security.local';

    if (!host) {
      throw new BadRequestException(
        'El Servidor SMTP (Host) es requerido para la prueba.',
      );
    }
    if (!dto.targetEmail) {
      throw new BadRequestException(
        'Debes indicar un correo de destino para la prueba.',
      );
    }

    this.logger.log(
      `Iniciando prueba de conexión SMTP hacia ${host}:${port} (Usuario: ${user || 'ninguno'})...`,
    );

    // 2. Crear el transporter de nodemailer
    const transportOptions: nodemailer.TransportOptions = {
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false, // Permite certificados autofirmados o corporativos
      },
    } as any;

    const transporter = nodemailer.createTransport(transportOptions);

    try {
      // 3. Verificar conexión y handshake
      await transporter.verify();
      this.logger.log(
        `Verificación de conexión SMTP exitosa para ${host}:${port}`,
      );

      // 4. Enviar correo de prueba
      const nowStr = new Date().toLocaleString('es-DO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const info = await transporter.sendMail({
        from: `"${from.includes('@') ? from.split('@')[0] : 'Sistema POS'}" <${from}>`,
        to: dto.targetEmail,
        subject: `✅ Prueba de Conexión SMTP Exitosa - ${nowStr}`,
        html: `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <title>Prueba SMTP Exitosa</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="background-color: #0f172a; color: #ffffff; padding: 20px 24px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">Prueba de Conexión SMTP</h2>
                <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Sistema de Facturación & POS</p>
              </div>
              <div style="padding: 24px;">
                <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                  <p style="margin: 0; font-weight: 600; color: #065f46; font-size: 15px;">¡Conexión y autenticación exitosas!</p>
                  <p style="margin: 4px 0 0; color: #047857; font-size: 13px;">El servidor de correo ha respondido correctamente y la entrega funciona.</p>
                </div>
                <h4 style="margin: 0 0 10px; font-size: 13px; text-transform: uppercase; color: #64748b;">Parámetros Verificados:</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 0; color: #64748b;">Servidor SMTP:</td>
                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">${host}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 0; color: #64748b;">Puerto:</td>
                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">${port} (${secure ? 'SSL' : 'TLS/STARTTLS'})</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 0; color: #64748b;">Usuario Autenticado:</td>
                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">${user || 'Sin autenticación'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 0; color: #64748b;">Remitente (From):</td>
                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">${from}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Fecha y Hora:</td>
                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">${nowStr}</td>
                  </tr>
                </table>
                <div style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
                  Este es un mensaje automático de diagnóstico enviado desde el panel de Configuración.
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      return {
        success: true,
        message: `Conexión SMTP verificada y correo de prueba enviado a ${dto.targetEmail}`,
        details: {
          host,
          port,
          secure,
          user: user || null,
          from,
          messageId: info.messageId,
          response: info.response,
        },
      };
    } catch (error: any) {
      this.logger.error(`Fallo en prueba SMTP: ${error.message}`);

      let friendlyMessage = error.message;
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        friendlyMessage =
          'Error de autenticación: Verifica el usuario y la contraseña/App Password del servidor SMTP.';
      } else if (error.code === 'ESOCKET' || error.code === 'ECONNREFUSED') {
        friendlyMessage = `No se pudo conectar con el servidor ${host} en el puerto ${port}. Verifica que el host y puerto sean correctos y que no haya bloqueos de firewall.`;
      } else if (error.code === 'ETIMEDOUT') {
        friendlyMessage = `Tiempo de espera agotado al conectar con ${host}:${port}. Revisa la conectividad a internet o las restricciones del proveedor.`;
      } else if (error.code === 'ENOTFOUND') {
        friendlyMessage = `No se encontró el servidor ${host}. Verifica que el nombre del host SMTP esté bien escrito.`;
      }

      throw new BadRequestException({
        success: false,
        message: friendlyMessage,
        rawError: error.message,
        code: error.code || null,
      });
    }
  }

  private async ensureDefaultEmailSettings() {
    for (const def of [...DEFAULT_EMAIL_SETTINGS, ...DEFAULT_VALIDATION_SETTINGS]) {
      const exists = await this.configRepository.findOne({
        where: { key: def.key },
      });
      if (!exists) {
        const created = this.configRepository.create(def);
        await this.configRepository.save(created);
      }
    }
  }
}
