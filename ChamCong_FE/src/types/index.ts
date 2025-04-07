// types/index.ts
export interface IFingerprint {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  status: Status;
}

export enum Status {
  IN = "IN",
  OUT = "OUT",
}


export interface ColumnType{
  id: string;
  name?: string;
  timestamp?: string;
  date?: string;
  status?: Status;
}