// types/index.ts
export interface IFingerprint {
  id: string;
  name?: string; // Thêm trường name (tùy chọn nếu không bắt buộc)
  timestamp: string;
}

export interface IFingerprintData {
  count: number;
  ids: number[];
}