export interface ReportData {
  shipment_number: string;
  destination: string;
  created_at: number;
  completed_at?: number;
  parts_count: number;
  packed_count: number;
  total_weight?: number;
  packing_time_seconds?: number;
  parts: ReportPart[];
}

export interface ReportPart {
  sap_index: string;
  description: string;
  quantity: number;
  unit: string;
  weight_total?: number;
  weight_per_unit?: number;
  country_of_origin?: string;
  photos?: string[];
}

export interface ExportOptions {
  includePDF: boolean;
  includeExcel: boolean;
  includeHTML: boolean;
  exportToNetwork: boolean;
}

export interface ExportResult {
  success: boolean;
  localPath?: string;
  networkPath?: string;
  error?: string;
}
