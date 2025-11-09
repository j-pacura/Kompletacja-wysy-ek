export interface Part {
  id: number;
  shipment_id: number;

  sap_index: string;
  description: string;
  quantity: number;
  unit: string;

  status: 'pending' | 'packed';
  packed_at?: number;
  packing_time_seconds?: number;

  weight_total?: number;
  weight_per_unit?: number;
  country_of_origin?: string;

  excel_row_number?: number;
}

export interface PartFromExcel {
  sap_index: string;
  description: string;
  quantity: number;
  unit: string;
  country_of_origin?: string;
  excel_row_number: number;
}
