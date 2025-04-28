import {Button, Card, Row, Col, Statistic, Typography, Divider} from "antd";
import {useNavigate} from "react-router";
import {
  UserOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {useQuery} from "@tanstack/react-query";
import QUERY_KEY from "@/api/QueryKey";
import ApiUser from "@/api/ApiUser";
import ApiAttendanceLog from "@/api/ApiAttendanceLog";

const {Title, Paragraph} = Typography;

export default function Home(): JSX.Element {
  const navigate = useNavigate();

  // Lấy ngày hôm nay
  const today = new Date();

  // Truy vấn dữ liệu người dùng để hiển thị tổng số
  const {data: userData} = useQuery({
    queryKey: [QUERY_KEY.USER.DATA],
    queryFn: () => ApiUser.getUsers({page: 1, pageSize: 1}),
  });

  // Truy vấn tổng số log điểm danh
  const {data: attendanceData} = useQuery({
    queryKey: [QUERY_KEY.ATTENDANCE.DATA],
    queryFn: () => ApiAttendanceLog.getLogs({page: 1, pageSize: 1}),
  });

  // Truy vấn số log điểm danh hôm nay - sử dụng getTodayLogs
  const {data: todayAttendanceData} = useQuery({
    queryKey: [QUERY_KEY.ATTENDANCE.TODAY],
    queryFn: () =>
      ApiAttendanceLog.getLogs({
        page: 1,
        pageSize: 1,
        startDate: today.toISOString().split("T")[0],
      }),
  });

  const totalUsers = userData?.totalUsers || 0;
  const totalAttendance = attendanceData?.totalLogs || 0;
  const todayAttendance = todayAttendanceData?.totalLogs || 0;

  return (
    <div className="container flex flex-col w-full h-full gap-6 p-6">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-8 rounded-lg shadow-md">
        <Title level={2} className="text-white mb-2">
          <div className="text-white">Chấm công PTIT</div>
        </Title>
        <Paragraph className="text-white text-lg opacity-90 mb-6">
          Hệ thống quản lý chấm công thông minh với vân tay
        </Paragraph>
        <Button
          type="primary"
          size="large"
          className="bg-white text-blue-500 border-0 hover:bg-gray-100 font-medium"
          onClick={() => navigate("/about")}
        >
          Quản lý ngay
        </Button>
      </div>

      {/* Stats section */}
      <Row gutter={16} className="mt-4">
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={true}
            className="h-full shadow-md hover:shadow-lg transition-shadow"
          >
            <Statistic
              title="Người dùng"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{color: "#1890ff"}}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={true}
            className="h-full shadow-md hover:shadow-lg transition-shadow"
          >
            <Statistic
              title="Lượt chấm công"
              value={totalAttendance}
              prefix={<ClockCircleOutlined />}
              valueStyle={{color: "#52c41a"}}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={true}
            className="h-full shadow-md hover:shadow-lg transition-shadow"
          >
            <Statistic
              title="Điểm danh hôm nay"
              value={todayAttendance}
              prefix={<ClockCircleOutlined />}
              valueStyle={{color: "#faad14"}}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={true}
            className="h-full shadow-md hover:shadow-lg transition-shadow"
          >
            <Statistic
              title="Thiết bị hoạt động"
              value={1}
              prefix={<BarChartOutlined />}
              valueStyle={{color: "#eb2f96"}}
            />
          </Card>
        </Col>
      </Row>

      {/* Features section */}
      <div className="mt-4">
        <Divider orientation="left">
          <Title level={2} className="m-0">
            Tính năng chính
          </Title>
        </Divider>
        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24} md={8}>
            <Card
              title="Quản lý người dùng"
              bordered={true}
              className="h-full shadow-md hover:shadow-lg transition-shadow"
            >
              <Paragraph className="px-3 py-2">
                Quản lý danh sách người dùng, thêm, sửa, xóa thông tin và quản
                lý vân tay.
              </Paragraph>
              <Button type="link" onClick={() => navigate("/about")}>
                Truy cập
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title="Báo cáo chấm công"
              bordered={true}
              className="h-full shadow-md hover:shadow-lg transition-shadow"
            >
              <Paragraph className="px-3 py-2">
                Xem báo cáo chi tiết về lịch sử chấm công, xuất báo cáo Excel.
              </Paragraph>
              <Button type="link" onClick={() => navigate("/about")}>
                Truy cập
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title="Đăng ký vân tay"
              bordered={true}
              className="h-full shadow-md hover:shadow-lg transition-shadow"
            >
              <Paragraph className="px-3 py-2">
                Đăng ký vân tay để quản lý chấm công.
              </Paragraph>
              <Button type="link" onClick={() => navigate("/about")}>
                Truy cập
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
