export interface DeviceInfo {
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

export interface LocationInfo {
  ipAddress?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface SessionInfo {
  device: DeviceInfo;
  location: LocationInfo;
}
