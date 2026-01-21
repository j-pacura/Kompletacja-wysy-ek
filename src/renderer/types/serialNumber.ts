export interface SerialNumber {
  id: number;
  part_id: number;
  serial_number: string;
  photo_path: string | null;
  sequence: number;
  ocr_confidence: number | null;
  manually_entered: boolean;
  created_at: number;
}
