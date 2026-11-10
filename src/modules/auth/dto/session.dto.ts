export class SessionResponseDto {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  lastActivityAt: Date;
  createdAt: Date;
}
