import type { ContainerStatus } from '../entities/shipment-container.entity';

export type TrackingStage =
  | 'GATE_IN'
  | 'LOADED'
  | 'DEPARTED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DISCHARGED';

export interface ContainerTrackingEvent {
  date: string;
  stage: TrackingStage;
  description: string;
  location: string;
}

export interface TrackingResult {
  containerNumber: string;
  carrierCode?: string | null;
  status: ContainerStatus;
  etd: string | null;
  eta: string | null;
  ata: string | null;
  currentLocation: string | null;
  events: ContainerTrackingEvent[];
}

export interface ContainerTrackingProvider {
  track(
    containerNumber: string,
    carrierCode?: string | null,
  ): Promise<TrackingResult>;
}
