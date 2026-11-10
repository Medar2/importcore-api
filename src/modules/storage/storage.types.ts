export const STORAGE_PROVIDERS = [
  'LOCAL',
  'AWS',
  'GCP',
  'AZURE',
  'CLOUDINARY',
] as const;

export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

export interface StoredFile {
  url: string;
  provider: StorageProvider;
  path: string;
}

export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  folder: string;
}
