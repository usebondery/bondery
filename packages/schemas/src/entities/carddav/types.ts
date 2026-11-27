export interface CarddavDevice {
  clientFamily: string | null;
  createdAt: string;
  id: string;
  keyStart: string;
  lastSeenAt: string | null;
  lastSyncedAt: string | null;
  name: string;
  pausedAt: string | null;
}

export interface CarddavCredentials {
  password: string;
  serverUrl: string;
  username: string;
}

export interface CarddavSettings {
  devices: CarddavDevice[];
  enabled: boolean;
  maxDevices: number;
  serverUrl: string;
  username: string;
}

export interface CarddavSettingsResponse {
  carddav: CarddavSettings;
}

export interface CreateCarddavDeviceInput {
  name: string;
}

export interface UpdateCarddavDeviceInput {
  name: string;
}

export interface CarddavDeviceResponse {
  device: CarddavDevice;
}

export interface CarddavDeviceCredentialsResponse {
  credentials: CarddavCredentials;
  device: CarddavDevice;
}
