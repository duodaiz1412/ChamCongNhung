import {ColumnType} from "@/types";
import {Status} from "@/types";
import {TableColumnType} from "antd";
import Table from "antd/es/table";
import {useState} from "react";

interface AttendanceRecord {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  status: Status;
}

export default function DetailAttendance() {
  const [data, setData] = useState<AttendanceRecord[]>([
    {
      id: "1",
      name: "Nguyễn Văn A",
      timestamp: "8:00 AM",
      date: "2022-01-01",
      status: Status.IN,
    },
    {
      id: "2",
      name: "Nguyễn Văn B",
      timestamp: "8:15 AM",
      date: "2022-01-01",
      status: Status.IN,
    },
    {
      id: "3",
      name: "Nguyễn Văn C",
      timestamp: "8:30 AM",
      date: "2022-01-01",
      status: Status.OUT,
    },
    {
      id: "4",
      name: "Nguyễn Văn D",
      timestamp: "8:45 AM",
      date: "2022-01-01",
      status: Status.IN,
    },
  ]);

  const columns: TableColumnType<ColumnType>[] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 170,
    },
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "Thời gian",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 250,
    },
    {
      title: "Ngày",
      dataIndex: "date",
      key: "date",
      width: 250,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 250,
      render: (value: Status) => {
        return (
          <div
            className={`rounded-full px-3 w-fit text-white font-semibold ${value === Status.IN ? "bg-[#22C55E]" : "bg-[#F97316]"}`}
          >
            {value === Status.IN ? "Vào" : "Ra"}
          </div>
        );
      },
    },
  ];

  return (
    <div className="border border-gray rounded-md p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center">
          <div className="text-2xl font-bold">Danh Sách Chấm Công</div>
        </div>
        <div className="text-sm text-gray-500">
          Danh sách chấm công của tất cả người dùng
        </div>
        <Table dataSource={data} columns={columns} rowKey="id" />
      </div>
    </div>
  );
}
