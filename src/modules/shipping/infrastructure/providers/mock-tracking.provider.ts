import { Injectable } from '@nestjs/common';
import type {
  ContainerTrackingProvider,
  TrackingResult,
} from '../../domain/tracking-provider.interface';

@Injectable()
export class MockTrackingProvider implements ContainerTrackingProvider {
  async track(
    containerNumber: string,
    carrierCode?: string | null,
  ): Promise<TrackingResult> {
    const isArrived = containerNumber.toUpperCase().includes('ARR');
    const carrier = carrierCode?.toUpperCase() || 'COSCO';

    const now = new Date();
    const etdDate = new Date(now.getTime() - 15 * 86400000);
    const etaDate = isArrived
      ? new Date(now.getTime() - 1 * 86400000)
      : new Date(now.getTime() + 10 * 86400000);

    const etd = etdDate.toISOString().slice(0, 10);
    const eta = etaDate.toISOString().slice(0, 10);
    const ata = isArrived ? eta : null;

    return {
      containerNumber,
      carrierCode: carrier,
      status: isArrived ? 'ARRIVED' : 'IN_TRANSIT',
      etd,
      eta,
      ata,
      currentLocation: isArrived
        ? 'Puerto Multimodal Caucedo, República Dominicana'
        : 'Océano Pacífico (Aproximación a Canal de Panamá)',
      events: [
        {
          date: new Date(now.getTime() - 18 * 86400000).toISOString(),
          stage: 'GATE_IN',
          description: `Contenedor recibido en patio portuario (${carrier})`,
          location: 'Puerto de Ningbo-Zhoushan, China',
        },
        {
          date: new Date(now.getTime() - 16 * 86400000).toISOString(),
          stage: 'LOADED',
          description: 'Cargado a bordo del buque portacontenedores',
          location: 'Terminal Meishan, Ningbo, China',
        },
        {
          date: etdDate.toISOString(),
          stage: 'DEPARTED',
          description: 'Buque zarpó con destino a República Dominicana',
          location: 'Puerto de Ningbo-Zhoushan, China',
        },
        {
          date: new Date(now.getTime() - 5 * 86400000).toISOString(),
          stage: 'IN_TRANSIT',
          description: 'Tránsito marítimo en altamar / Paso interoceánico',
          location: 'En navegación (Pacífico Central)',
        },
        ...(isArrived
          ? [
              {
                date: etaDate.toISOString(),
                stage: 'ARRIVED' as const,
                description: 'Buque atracado y contenedor descargado en muelle',
                location: 'Puerto Multimodal Caucedo, República Dominicana',
              },
            ]
          : []),
      ],
    };
  }
}
