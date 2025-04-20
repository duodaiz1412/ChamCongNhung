// types/index.ts
export interface IAttendanceLog {
  _id: string;
  timestamp?: string;
  eventType?: EventType;
  user?: IUser;
  loggedAt?: string;
  updatedAt?: string;
  __v?: number;
}

export enum EventType {
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT",
  SCAN = "SCAN",
}

export interface ILogParam {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}

export interface IUser {
  userId: string;
  name?: string;
  msv?: string;
}

export interface IData {
  data: IAttendanceLog[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalLogs: number;
}
