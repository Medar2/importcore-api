import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { SystemConfigService } from '../config/services/system-config.service';
import {
  STORAGE_PROVIDERS,
  StoredFile,
  StorageProvider,
  UploadFileInput,
} from './storage.types';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: SystemConfigService) {}

  async upload(file: UploadFileInput): Promise<StoredFile> {
    this.assertFile(file);
    const provider = await this.getProvider();
    const safeName = this.buildFileName(file.originalName);

    switch (provider) {
      case 'LOCAL':
        return this.uploadLocal(file, safeName);
      case 'CLOUDINARY':
        return this.uploadCloudinary(file, safeName);
      case 'AWS':
      case 'GCP':
      case 'AZURE':
        throw new BadRequestException(
          `El proveedor ${provider} está configurado, pero la subida directa aún no está activa. Usa LOCAL o CLOUDINARY en Configuración > Almacenamiento.`,
        );
      default:
        throw new BadRequestException(
          `Proveedor de almacenamiento no soportado: ${provider as string}`,
        );
    }
  }

  async getProvider(): Promise<StorageProvider> {
    const value = (
      (await this.configService.getValue('STORAGE.PROVIDER', 'LOCAL')) ||
      'LOCAL'
    )
      .trim()
      .toUpperCase();

    if (!STORAGE_PROVIDERS.includes(value as StorageProvider)) {
      return 'LOCAL';
    }
    return value as StorageProvider;
  }

  private assertFile(file: UploadFileInput) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('La imagen no puede superar 5 MB');
    }
    if (!ALLOWED_MIME.has(file.mimeType)) {
      throw new BadRequestException(
        'Formato no permitido. Usa JPG, PNG, WEBP o GIF',
      );
    }
  }

  private buildFileName(originalName: string) {
    const ext = extname(originalName || '').toLowerCase() || '.jpg';
    return `${randomUUID()}${ext}`;
  }

  private async uploadLocal(
    file: UploadFileInput,
    fileName: string,
  ): Promise<StoredFile> {
    const folder = file.folder.replace(/[^a-z0-9/_-]/gi, '') || 'general';
    const relativePath = join(folder, fileName);
    const absoluteDir = join(process.cwd(), 'uploads', folder);
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(join(process.cwd(), 'uploads', relativePath), file.buffer);

    const publicBase =
      (await this.configService.getValue(
        'STORAGE.PUBLIC_BASE_URL',
        'http://localhost:8001',
      )) || 'http://localhost:8001';

    const url = `${publicBase.replace(/\/$/, '')}/uploads/${folder}/${fileName}`;
    this.logger.log(`Archivo guardado en LOCAL: ${url}`);
    return { url, provider: 'LOCAL', path: relativePath.replace(/\\/g, '/') };
  }

  private async uploadCloudinary(
    file: UploadFileInput,
    fileName: string,
  ): Promise<StoredFile> {
    const cloudName = await this.configService.getValue(
      'STORAGE.CLOUDINARY_CLOUD_NAME',
    );
    const uploadPreset = await this.configService.getValue(
      'STORAGE.CLOUDINARY_UPLOAD_PRESET',
    );

    if (!cloudName || !uploadPreset) {
      throw new BadRequestException(
        'Cloudinary requiere STORAGE.CLOUDINARY_CLOUD_NAME y STORAGE.CLOUDINARY_UPLOAD_PRESET en Configuración > Almacenamiento.',
      );
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }),
      fileName,
    );
    form.append('upload_preset', uploadPreset);
    form.append('folder', file.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: form },
    );

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Cloudinary error: ${detail}`);
      throw new BadRequestException(
        'No se pudo subir la imagen a Cloudinary. Revisa cloud name y upload preset.',
      );
    }

    const payload = (await response.json()) as {
      secure_url?: string;
      url?: string;
    };
    const url = payload.secure_url || payload.url;
    if (!url) {
      throw new BadRequestException('Cloudinary no devolvió una URL de imagen');
    }

    return { url, provider: 'CLOUDINARY', path: url };
  }
}
