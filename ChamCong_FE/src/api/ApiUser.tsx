import {ILogParam, IUser, IUserResponse} from "@/types";
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

function deleteUser(userId: string): Promise<void> {
  return fetcher({
    url: `${path.users}/${userId}`,
    method: "DELETE",
  });
}

function updateUser(userId: string, userData: Partial<IUser>): Promise<IUser> {
  return fetcher({
    url: `${path.users}/${userId}`,
    method: "PUT",
    data: userData,
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
  deleteUser,
  updateUser
};
