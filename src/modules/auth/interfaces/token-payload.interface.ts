export interface AccessTokenPayload {
  userId: string;
  email: string;
  username: string;
  organizationId: string | null;
  roles: string[];
  permissions?: string[];
  permissionsHash?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export interface TempTokenPayload {
  userId: string;
  mfaRequired: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email: string;
    username: string;
    nombre: string;
    apellido: string;
    organizationId: string | null;
    roles: any[];
  };
}
