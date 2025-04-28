import {IData, ILogParam} from "@/types";
import {fetcher} from "./Fetcher";

const path = {
  logs: "/logs",
  exportExcel: "/export-excel",
  todayLogs: "/logs/today"
};

function getLogs(params: ILogParam): Promise<IData> {
  return fetcher({
    url: path.logs,
    method: "GET",
    params,
  });
}

function getTodayLogs(): Promise<IData> {
  return fetcher({
    url: path.todayLogs,
    method: "GET",
  });
}

function downloadExcel(params: ILogParam = {}): Promise<Blob> {
  return fetcher<Blob>({
    url: path.exportExcel,
    method: "GET",
    params,
  }, {
    skipJsonParsing: true, // Pass skipJsonParsing in options
  });
}

export default {
  getLogs,
  downloadExcel,
  getTodayLogs,
};