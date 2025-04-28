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
  startDate?: string;
  endDate?: string;
}

export interface IUser {
  userId: string;
  name?: string;
  msv?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface IData {
  data: IAttendanceLog[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalLogs: number;
}

export interface IUserResponse {
  data: IUser[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalUsers: number;
}
