export interface Shipment {
  id: number;
  shipment_number: string;
  destination: string;
  notes?: string;
  created_at: number;
  completed_at?: number;
  status: 'in_progress' | 'paused' | 'completed';

  require_weight: boolean;
  require_country: boolean;
  require_photos: boolean;

  packed_by?: string;
  packing_time_seconds?: number;
  excel_file_path?: string;
  password?: string;
  created_date: string;
  archived?: boolean;
}

export interface CreateShipmentInput {
  shipment_number: string;
  destination: string;
  notes?: string;
  require_weight: boolean;
  require_country: boolean;
  require_photos: boolean;
  excel_file_path?: string;
  packed_by?: string;
  password?: string;
}
