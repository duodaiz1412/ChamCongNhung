import {ILogParam, IUser} from "@/types";
import {fetcher} from "./Fetcher";

const path = {
  users: "/users",
  exportExcel: "/export-excel",
};

function getUsers(params: ILogParam): Promise<IUser> {
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
