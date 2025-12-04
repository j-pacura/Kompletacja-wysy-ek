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
  weight_quantity?: number;
  country_of_origin?: string | null;

  // Investment order fields (optional)
  order_number?: string | null;
  order_description?: string | null;

  excel_row_number?: number;
}

export interface PartFromExcel {
  sap_index: string;
  description: string;
  quantity: number;
  unit: string;
  country_of_origin?: string;
  order_number?: string;
  order_description?: string;
  excel_row_number: number;
}
