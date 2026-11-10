import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ECF_PROVIDER } from '../../application/ports/ecf-provider.port';
import type { ECfProvider } from '../../application/ports/ecf-provider.port';
import { MockECfProvider } from './mock-ecf.provider';

/**
 * Selecciona el adaptador según `ECF_PROVIDER` (default `mock`). Para un
 * proveedor real: implementar `ECfProvider`, registrarlo aquí y configurar
 * sus credenciales (`ECF_API_URL`, `ECF_API_KEY`, …) en el entorno.
 */
export const ecfProviderFactory: Provider = {
  provide: ECF_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): ECfProvider => {
    const name = (config.get<string>('ECF_PROVIDER') ?? 'mock').toLowerCase();
    switch (name) {
      case 'mock':
        return new MockECfProvider();
      default:
        throw new Error(`Proveedor e-CF no soportado: ${name}`);
    }
  },
};
