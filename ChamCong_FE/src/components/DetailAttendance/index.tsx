import ApiAttendanceLog from "@/api/ApiAttendanceLog";
import QUERY_KEY from "@/api/QueryKey";
import {EventType, IAttendanceLog, ILogParam} from "@/types";
import {convertDate, convertDateToTime} from "@/utils/timeUtils";
import {useQuery} from "@tanstack/react-query";
import {TableColumnType} from "antd";
import Table from "antd/es/table";
import {useEffect} from "react";

interface TableRecord {
  id: string;
  stt: number;
  name: string;
  timestamp: string | undefined;
  date: string | undefined;
  eventType: EventType;
}

export default function DetailAttendance() {
  const params: ILogParam = {
    page: 1,
    pageSize: 10,
  };

  const {
    data: logData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY.ATTENDANCE.DATA, params],
    queryFn: () => ApiAttendanceLog.getLogs(params),
  });

  const totalLogs = logData?.totalLogs;

  const data = logData?.data?.reverse()?.map((log: IAttendanceLog, index: number) => ({
    stt: totalLogs ? totalLogs - index : 0,
    id: log._id,
    name: log.user?.name || "Unknown",
    timestamp: log.timestamp,
    date: log.timestamp,
    eventType: log.eventType || EventType.SCAN,
  }));

  useEffect(() => {
    if (data) {
      refetch();
    }
  }, [data, refetch]);

  const columns: TableColumnType<TableRecord>[] = [
    {
      title: "STT",
      dataIndex: "stt",
      key: "stt",
      width: 150,
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
      key: "time",
      width: 250,
      render: (value) => {
        return convertDateToTime(value);
      },
    },
    {
      title: "Ngày",
      dataIndex: "timestamp",
      key: "date",
      width: 250,
      render: (value: string) => {
        return convertDate(value);
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "eventType",
      key: "eventType",
      width: 250,
      render: (value: EventType) => {
        return (
          <div
            className={`rounded-full px-3 w-fit text-white font-semibold ${
              value === EventType.CHECK_IN ? "bg-[#22C55E]" : "bg-[#F97316]"
            }`}
          >
            {value === EventType.CHECK_IN ? "Vào" : "Ra"}
          </div>
        );
      },
    },
  ];

  return (
    <div className="border border-gray rounded-md p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center">
          <div className="text-2xl font-bold">Danh Sách Chấm Công</div>
        </div>
        <div className="text-sm text-gray-500">
          Danh sách chấm công của tất cả người dùng
        </div>
      </div>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />
    </div>
  );
}
