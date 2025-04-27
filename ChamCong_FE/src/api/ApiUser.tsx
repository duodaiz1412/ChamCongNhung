import {ILogParam, IUserResponse} from "@/types";
import {fetcher} from "./Fetcher";

const path = {
  users: "/users",
  exportExcel: "/export-excel",
};

function getUsers(params: ILogParam): Promise<IUserResponse> {
  return fetcher({
    url: path.users,
    method: "GET",
    params,
  });
}

function downloadExcel(params: ILogParam = {}): Promise<Blob> {
  return fetcher<Blob>(
    {
      url: path.exportExcel,
      method: "GET",
      params,
    },
    {
      skipJsonParsing: true, // Pass skipJsonParsing in options
    },
  );
}

export default {
  getUsers,
  downloadExcel,
};
