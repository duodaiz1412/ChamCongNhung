import ApiUser from "@/api/ApiUser";
import QUERY_KEY from "@/api/QueryKey";
import {IUser} from "@/types";
import {convertDate} from "@/utils/timeUtils";
import {useQuery} from "@tanstack/react-query";
import {Input, TableColumnType, Pagination} from "antd";
import Table from "antd/es/table";
import {Pen, Trash2, Search} from "lucide-react";
import {useState, useEffect} from "react";
import ModalDelete from "../ModalDelete";
import ModalEdit from "../ModalEdit";

interface TableRecord {
  stt: number;
  name: string;
  msv: string;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  isActive: boolean | undefined;
  userId: string;
}

export default function UserManager() {
  const [selectedUser, setSelectedUser] = useState<IUser | undefined>(undefined);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  
  const handleOpenDeleteModal = (user: IUser) => {
    setShowDeleteModal(true);
    setSelectedUser(user);
  };
  
  const handleOpenEditModal = (user: IUser) => {
    setShowEditModal(true);
    setSelectedUser(user);
  };
  
  const [params] = useState({
    page: 1,
    pageSize: 100,
  });
  const {data: userData, isLoading, refetch} = useQuery({
    queryKey: [QUERY_KEY.USER.DATA, params],
    queryFn: () => ApiUser.getUsers(params),
  });

  // Thêm state để lưu trữ từ khóa tìm kiếm
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Thêm state cho phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  // Thêm state để lưu trữ dữ liệu đã lọc
  const [filteredData, setFilteredData] = useState<TableRecord[]>([]);

  // Cập nhật dữ liệu đã lọc khi searchTerm hoặc data thay đổi
  useEffect(() => {
    const filtered = data.filter(
      (record) =>
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.msv &&
          record.msv.toLowerCase().includes(searchTerm.toLowerCase())),
    );
    setFilteredData(filtered);
    // Reset về trang đầu tiên khi thay đổi bộ lọc
    setCurrentPage(1);
  }, [searchTerm, data]);

  // Xử lý khi input tìm kiếm thay đổi
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Xử lý khi thay đổi trang
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  // Tính toán dữ liệu hiển thị theo trang hiện tại
  const paginatedData = (() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  })();

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
      render: (isActive: boolean | undefined) =>
        isActive ? "Đang hoạt động" : "Không hoạt động",
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 250,
      render: (_, record) => {
        return (
          <div className="flex gap-7">
            <Pen 
              size={20} 
              className="cursor-pointer" 
              onClick={() => handleOpenEditModal({
                userId: record.userId,
                name: record.name,
                msv: record.msv,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                isActive: record.isActive
              })}
            />
            <Trash2 
              size={20} 
              className="cursor-pointer" 
              onClick={() => handleOpenDeleteModal({
                userId: record.userId,
                name: record.name,
                msv: record.msv,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                isActive: record.isActive
              })}
            />
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
      <div className="flex flex-row relative w-full mb-4 gap-3">
        <Input
          placeholder="Tìm kiếm theo tên hoặc MSV..."
          value={searchTerm}
          onChange={handleSearch}
          prefix={<Search size={16} className="text-gray-400" />}
          className="py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <Table
        dataSource={paginatedData}
        columns={columns as any}
        loading={isLoading}
        rowKey="userId"
        pagination={false} // Tắt pagination mặc định của Table
      />

      {/* Thêm component Pagination riêng */}
      {filteredData.length > 0 && (
        <div className="flex justify-end mt-4">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredData.length}
            onChange={handlePageChange}
            showSizeChanger={true}
            showTotal={(total, range) =>
              `Hiển thị ${range[0]}-${range[1]} trong ${total} mục`
            }
          />
        </div>
      )}
      <ModalDelete
        data={selectedUser}
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          refetch();
        }}
      />
      <ModalEdit
        data={selectedUser}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={() => {
          refetch();
        }}
      />
    </div>
  );
}
