import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ContainerTrackingProvider,
  ContainerTrackingEvent,
  TrackingResult,
  TrackingStage,
} from '../../domain/tracking-provider.interface';
import type { ContainerStatus } from '../../entities/shipment-container.entity';

@Injectable()
export class SeventeenTrackProvider implements ContainerTrackingProvider {
  private readonly logger = new Logger(SeventeenTrackProvider.name);
  private readonly apiKey: string | null;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('SEVENTEEN_TRACK_API_KEY') || null;
  }

  async track(
    containerNumber: string,
    carrierCode?: string | null,
  ): Promise<TrackingResult> {
    if (!this.apiKey) {
      throw new Error(
        'SEVENTEEN_TRACK_API_KEY no está configurada en las variables de entorno',
      );
    }

    const payload = [
      {
        number: containerNumber,
        carrier: carrierCode ? parseInt(carrierCode, 10) || undefined : undefined,
      },
    ];

    const response = await fetch('https://api.17track.net/track/v1/gettrackinfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '17token': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Error al consultar 17TRACK: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      code: number;
      data?: {
        accepted?: Array<{
          number: string;
          track?: {
            b10?: number; // Package delivery status
            z0?: {
              c?: string; // Carrier
              d?: string; // Status description
              a?: string; // Departure date / ETD
              b?: string; // Arrival date / ETA
              z?: Array<{
                a?: string; // Time
                z?: string; // Event description
                c?: string; // City / Location
              }>;
            };
          };
        }>;
      };
    };

    const record = json.data?.accepted?.[0];
    const trackInfo = record?.track?.z0;
    const events: ContainerTrackingEvent[] = (trackInfo?.z ?? []).map((e) => {
      const desc = e.z || '';
      let stage: TrackingStage = 'IN_TRANSIT';
      const lower = desc.toLowerCase();
      if (lower.includes('gate in') || lower.includes('received')) stage = 'GATE_IN';
      else if (lower.includes('loaded') || lower.includes('stuffing')) stage = 'LOADED';
      else if (lower.includes('departed') || lower.includes('sail')) stage = 'DEPARTED';
      else if (lower.includes('arrived') || lower.includes('discharged')) stage = 'ARRIVED';

      return {
        date: e.a || new Date().toISOString(),
        stage,
        description: desc,
        location: e.c || '',
      };
    });

    const isDelivered = record?.track?.b10 === 40;
    const isArrived =
      isDelivered ||
      events.some((ev) => ev.stage === 'ARRIVED' || ev.stage === 'DISCHARGED');

    let status: ContainerStatus = 'IN_TRANSIT';
    if (isDelivered) status = 'DELIVERED';
    else if (isArrived) status = 'ARRIVED';

    return {
      containerNumber,
      carrierCode: carrierCode || null,
      status,
      etd: trackInfo?.a || null,
      eta: trackInfo?.b || null,
      ata: isArrived ? trackInfo?.b || new Date().toISOString().slice(0, 10) : null,
      currentLocation: events[0]?.location || null,
      events,
    };
  }
}
