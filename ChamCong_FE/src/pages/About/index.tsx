import DeviceStatus from "@components/DeviceStatus";
import {Button, Segmented} from "antd";
import {useState} from "react";
import {useNavigate} from "react-router";
import "./index.scss";
import DetailAttendance from "@components/DetailAttendance";
import Register from "@components/Register";
import UserManager from "@/components/UserManager";

export default function About(): JSX.Element {
  const [tab, setTab] = useState("tracking");

  const tabItems = [
    {
      key: "tracking",
      label: "Chấm công",
      value: "tracking",
    },
    {
      key: "register",
      label: "Đăng ký vân tay",
      value: "register",
    },
    {
      key: "manager",
      label: "Quản lý người dùng",
      value: "manager",
    },
  ];

  const renderTabContent = () => {
    switch (tab) {
      case "tracking":
        return <DetailAttendance />;
      case "register":
        return <Register />;
      case "manager":
        return <UserManager />;
      default:
        return null;
    }
  };

  const navigate = useNavigate();
  return (
    <div className="container flex flex-col w-full h-full gap-6 p-6">
      <div className="text-3xl font-bold">Hệ Thống Điểm Danh Vân Tay</div>
      <DeviceStatus />
      <div className="flex flex-col gap-3">
        <Segmented
          options={tabItems}
          value={tab}
          onChange={(value) => {
            setTab(value.toString());
          }}
          size="large"
          className="w-full"
        />
        <div className="attendance-table">{renderTabContent()}</div>
      </div>

      <Button
        color="default"
        className="w-fit mx-auto"
        onClick={() => navigate("/")}
      >
        Go back
      </Button>
    </div>
  );
}
