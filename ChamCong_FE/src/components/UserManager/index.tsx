import ApiUser from "@/api/ApiUser";
import QUERY_KEY from "@/api/QueryKey";
import {IUser} from "@/types";
import {convertDate} from "@/utils/timeUtils";
import {useQuery} from "@tanstack/react-query";
import {TableColumnType} from "antd";
import Table from "antd/es/table";
import {Pen, Trash2} from "lucide-react";
import {useState} from "react";

interface TableRecord {
  stt: number;
  name: string;
  msv: string;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  isActive: boolean;
  userId: string;
}

export default function UserManager() {
  const [params] = useState({
    page: 1,
    pageSize: 100,
  });
  const {data: userData, isLoading} = useQuery({
    queryKey: [QUERY_KEY.USER.DATA, params],
    queryFn: () => ApiUser.getUsers(params),
  });

  const data =
    userData?.data?.map((user: IUser, index: number) => ({
      stt: index + 1,
      name: user.name || "",
      msv: user.msv || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
      userId: user.userId,
    })) || [];

  const columns: TableColumnType<TableRecord>[] = [
    {
      title: "STT",
      dataIndex: "stt",
      key: "stt",
      width: 170,
    },
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "MSV",
      dataIndex: "msv",
      key: "msv",
      width: 250,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 250,
      render: (value: string) => {
        return convertDate(value);
      },
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 250,
      render: (value: string) => {
        return convertDate(value);
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 250,
      render: (isActive: boolean) =>
        isActive ? "Đang hoạt động" : "Không hoạt động",
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 250,
      render: () => {
        return (
          <div className="flex gap-7">
            <Pen size={20} className="cursor-pointer" />
            <Trash2 size={20} className="cursor-pointer" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="border border-gray rounded-md p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center">
          <div className="text-2xl font-bold">Quản Lý Người Dùng</div>
        </div>
        <div className="text-sm text-gray-500">
          Xem và quản lý tất cả người dùng trong hệ thống
        </div>
      </div>
      <Table
        dataSource={data}
        columns={columns as any}
        loading={isLoading}
        rowKey="userId"
      />
    </div>
  );
}
