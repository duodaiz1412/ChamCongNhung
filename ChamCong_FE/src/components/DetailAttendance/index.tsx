import ApiAttendanceLog from "@/api/ApiAttendanceLog";
import QUERY_KEY from "@/api/QueryKey";
import {EventType, IAttendanceLog, ILogParam} from "@/types";
import {convertDate, convertDateToTime} from "@/utils/timeUtils";
import {useQuery} from "@tanstack/react-query";
import {TableColumnType, Input, Select, DatePicker, Space, Button, Pagination} from "antd";
import Table from "antd/es/table";
import {useEffect, useState, useMemo} from "react";
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

  // State để lưu dữ liệu hiển thị, bộ lọc và phân trang
  const [allData, setAllData] = useState<TableRecord[]>([]);
  const [filters, setFilters] = useState<FilterValues>({
    name: "",
    eventType: "all",
    dateRange: null,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Cập nhật dữ liệu từ API
  useEffect(() => {
    if (logData?.data && logData.data.length > 0) {
      const rawData = logData.data.reverse().map((log: IAttendanceLog, index: number) => ({
        stt: totalLogs ? totalLogs - index : 0,
        id: log._id,
        name: log.user?.name || "Unknown",
        timestamp: log.timestamp,
        date: log.timestamp,
        eventType: log.eventType || EventType.SCAN,
      }));
      setAllData(rawData);
    } else {
      // Đặt mảng rỗng khi không có dữ liệu
      setAllData([]);
    }
  }, [logData, totalLogs]);

  // Lọc dữ liệu dựa trên các bộ lọc (sử dụng useMemo để tối ưu hiệu suất)
  const filteredData = useMemo(() => {
    if (!allData || !Array.isArray(allData)) return [];

    try {
      let filtered = [...allData];

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
          } catch (error) {
            console.error("Lỗi chuyển đổi ngày:", error);
            return false;
          }
        });
      }

      return filtered;
    } catch (error) {
      console.error("Lỗi khi áp dụng bộ lọc:", error);
      return [];
    }
  }, [allData, filters]);

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
  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) setPageSize(pageSize);
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

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Tìm kiếm theo tên */}
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <Input
            placeholder="Tìm kiếm theo tên..."
            value={filters.name}
            onChange={handleNameSearch}
            className="pl-10 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Lọc theo trạng thái */}
        <div className="w-full md:w-48">
          <Select
            placeholder="Trạng thái"
            value={filters.eventType}
            onChange={handleStatusChange}
            className="w-full"
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
            className="w-full"
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
            showSizeChanger={false}
            showTotal={(total, range) => `Hiển thị ${range[0]}-${range[1]} trong ${total} mục`}
          />
        </div>
      )}
    </div>
  );
}
