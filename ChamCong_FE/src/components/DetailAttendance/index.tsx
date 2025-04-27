import ApiAttendanceLog from "@/api/ApiAttendanceLog";
import QUERY_KEY from "@/api/QueryKey";
import {EventType, IAttendanceLog, ILogParam} from "@/types";
import {convertDate, convertDateToTime} from "@/utils/timeUtils";
import {DownloadOutlined} from "@ant-design/icons";
import {useQuery} from "@tanstack/react-query";
import {Button, message, TableColumnType, Input, Select, DatePicker, Pagination} from "antd";
import Table from "antd/es/table";
import {useState, useEffect, useMemo} from "react";
import {Search, Filter} from "lucide-react";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;

interface TableRecord {
  id: string;
  stt: number;
  name: string;
  timestamp: string | undefined;
  date: string | undefined;
  eventType: EventType;
}

interface FilterValues {
  name: string;
  eventType: EventType | "all";
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
}

export default function DetailAttendance() {
  const params: ILogParam = {
    page: 1,
    pageSize: 100,
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

  // Dữ liệu ban đầu từ API, sử dụng reverse như cũ
  const data = logData?.data
    ?.reverse()
    ?.map((log: IAttendanceLog, index: number) => ({
      stt: totalLogs ? totalLogs - index : 0,
      id: log._id,
      name: log.user?.name || "Unknown",
      timestamp: log.timestamp,
      date: log.timestamp,
      eventType: log.eventType || EventType.SCAN,
    }));

  // State để lưu dữ liệu hiển thị, bộ lọc và phân trang
  const [filters, setFilters] = useState<FilterValues>({
    name: "",
    eventType: "all",
    dateRange: null,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Áp dụng refetch khi data thay đổi
  useEffect(() => {
    if (data) {
      refetch();
    }
  }, [data, refetch]);

  // Lọc dữ liệu dựa trên các bộ lọc
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    try {
      let filtered = [...data];

      // Lọc theo tên
      if (filters.name) {
        filtered = filtered.filter(item => 
          item.name?.toLowerCase().includes(filters.name.toLowerCase())
        );
      }

      // Lọc theo trạng thái
      if (filters.eventType !== "all") {
        filtered = filtered.filter(item => 
          item.eventType === filters.eventType
        );
      }

      // Lọc theo khoảng thời gian
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        const startDate = filters.dateRange[0].startOf('day');
        const endDate = filters.dateRange[1].endOf('day');
        
        filtered = filtered.filter(item => {
          if (!item.timestamp) return false;
          try {
            const itemDate = dayjs(item.timestamp);
            return itemDate.isAfter(startDate) && itemDate.isBefore(endDate);
          } catch {
            return false;
          }
        });
      }

      return filtered;
    } catch {
      return [];
    }
  }, [data, filters]);

  // Tính toán dữ liệu hiển thị theo trang hiện tại
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Reset về trang đầu tiên khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Xử lý khi input tìm kiếm tên thay đổi
  const handleNameSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      name: e.target.value
    }));
  };

  // Xử lý khi trạng thái thay đổi
  const handleStatusChange = (value: EventType | "all") => {
    setFilters(prev => ({
      ...prev,
      eventType: value
    }));
  };

  // Xử lý khi khoảng ngày thay đổi
  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: dates
    }));
  };

  // Xử lý khi nhấn nút reset bộ lọc
  const handleResetFilters = () => {
    setFilters({
      name: "",
      eventType: "all",
      dateRange: null
    });
  };

  // Xử lý khi thay đổi trang
  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
  };

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

  const handleDownload = async () => {
    try {
      const response = await ApiAttendanceLog.downloadExcel();
      if (!(response instanceof Blob)) {
        throw new Error("Response is not a Blob");
      }
      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance_logs_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Tải xuống danh sách chấm công thành công!");
    } catch (error) {
      message.error(
        `Có lỗi: ${error} xảy ra khi tải xuống file Excel. Vui lòng thử lại.`,
      );
    }
  };

  return (
    <div className="border border-gray rounded-md p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">Danh Sách Chấm Công</div>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            className="bg-white border border-gray-300 rounded hover:bg-gray-100 text-black"
          >
            Xuất Excel
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Danh sách chấm công của tất cả người dùng
        </div>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Tìm kiếm theo tên */}
        <div className="relative w-1/2">
          <Input
            placeholder="Tìm kiếm theo tên..."
            value={filters.name}
            onChange={handleNameSearch}
            prefix={<Search size={16} className="text-gray-400" />}
            className="py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Lọc theo trạng thái */}
        <div className="w-full md:w-48">
          <Select
            placeholder="Trạng thái"
            value={filters.eventType}
            onChange={handleStatusChange}
            className="w-full h-10"
            suffixIcon={<Filter size={16} className="text-gray-400" />}
          >
            <Option value="all">Tất cả</Option>
            <Option value={EventType.CHECK_IN}>Vào</Option>
            <Option value={EventType.CHECK_OUT}>Ra</Option>
          </Select>
        </div>

        {/* Lọc theo khoảng ngày */}
        <div className="w-full md:w-auto">
          <RangePicker 
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
            className="w-full h-10"
          />
        </div>

        {/* Nút reset bộ lọc */}
        <div>
          <Button onClick={handleResetFilters} className="h-full">
            Reset
          </Button>
        </div>
      </div>

      {/* Hiển thị số lượng bản ghi đã lọc */}
      <div className="text-sm text-gray-500 mb-2">
        Tìm thấy {filteredData.length} bản ghi
      </div>

      {/* Bảng hiển thị dữ liệu phân trang */}
      <Table
        dataSource={paginatedData}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: "Không có dữ liệu" }}
      />

      {/* Phân trang */}
      {filteredData.length > 0 && (
        <div className="flex justify-end mt-4">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredData.length}
            onChange={handlePageChange}
            showSizeChanger={true}
            showTotal={(total, range) => `Hiển thị ${range[0]}-${range[1]} trong ${total} mục`}
          />
        </div>
      )}
    </div>
  );
}
