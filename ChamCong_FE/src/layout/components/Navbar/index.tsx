"use client";
import {Layout, Menu, Space, Button} from "antd";
import {BellOutlined, UserOutlined} from "@ant-design/icons";

const {Header} = Layout;

function Navbar() {
  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Hồ sơ",
    },
    {
      key: "settings",
      icon: <UserOutlined />,
      label: "Cài đặt",
    },
    {
      key: "logout",
      icon: <UserOutlined />,
      label: "Đăng xuất",
    },
  ];

  return (
    <div className="container mx-auto">
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(10px)",
          padding: "0",
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: "16px"}}>
          <div
            className="flex items-center gap-1.5 text-base font-bold"
          >
            <span style={{color: "", fontSize: "24px"}}>Chấm công</span>
            <span className="text-blue-500 text-[26px] tracking-wider">
              PTIT
            </span>
          </div>
        </div>

        <Space>
          <Button type="text" icon={<BellOutlined />} />
          <Menu
            mode="horizontal"
            items={userMenuItems}
            triggerSubMenuAction="click"
            style={{border: "none"}}
          />
        </Space>
      </Header>
    </div>
  );
}

export default Navbar;
