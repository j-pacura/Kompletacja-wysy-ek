export interface WeightReading {
  value: number;        // Weight value in kg
  unit: string;         // Unit (kg, g, etc)
  stable: boolean;      // Is the reading stable?
  timestamp: number;    // Unix timestamp
}

export interface ScaleConfig {
  comPort: string;
  baudRate: number;
  autoDetect: boolean;
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}
