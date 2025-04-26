import {EventType} from "@/types";
import {Input, TableColumnType} from "antd";
import Table from "antd/es/table";
import {Pen, Trash2, Search} from "lucide-react";
import {useState, useEffect} from "react";

interface AttendanceRecord {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  eventType: EventType;
}

export default function UserManager() {
  const [data, setData] = useState<AttendanceRecord[]>([
    {
      id: "1",
      name: "Nguyễn Văn A",
      timestamp: "8:00 AM",
      date: "2022-01-01",
      eventType: EventType.CHECK_IN,
    },
    {
      id: "2",
      name: "Nguyễn Văn B",
      timestamp: "8:15 AM",
      date: "2022-01-01",
      eventType: EventType.CHECK_IN,
    },
    {
      id: "3",
      name: "Nguyễn Văn C",
      timestamp: "8:30 AM",
      date: "2022-01-01",
      eventType: EventType.CHECK_OUT,
    },
    {
      id: "4",
      name: "Nguyễn Văn D",
      timestamp: "8:45 AM",
      date: "2022-01-01",
      eventType: EventType.CHECK_IN,
    },
  ]);
  
  // Thêm state để lưu trữ từ khóa tìm kiếm
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Thêm state để lưu trữ dữ liệu đã lọc
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>(data);

  // Cập nhật dữ liệu đã lọc khi searchTerm hoặc data thay đổi
  useEffect(() => {
    const filtered = data.filter(record => 
      record.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, data]);

  // Xử lý khi input tìm kiếm thay đổi
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const columns: TableColumnType<AttendanceRecord>[] = [
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
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 250,
      render: (params) => {
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
      
      {/* Thêm thanh tìm kiếm */}
      <div className="relative w-full md:w-64 mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-gray-400" />
        </div>
        <Input
          placeholder="Tìm kiếm theo tên..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-10 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Sử dụng filteredData thay vì data */}
      <Table dataSource={filteredData} columns={columns} rowKey="id" />
    </div>
  );
}
