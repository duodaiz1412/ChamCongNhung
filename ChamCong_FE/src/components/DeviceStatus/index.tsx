"use client";

import {useEffect} from "react";
import {Card} from "antd";
import {
  WifiOutlined,
  DisconnectOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {useDispatch, useSelector} from "react-redux";
import {setDeviceStatus} from "@/redux/slices/deviceSlice";
import {IRootState} from "@/redux/store";

export default function DeviceStatus() {
  const dispatch = useDispatch();
  const {isConnected, lastUpdate} = useSelector(
    (state: IRootState) => state.device,
  );

  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/status");
        const data = await response.json();
        if (data.status === "success") {
          dispatch(
            setDeviceStatus({
              isConnected: data.data.isConnected,
              lastUpdate: data.data.lastUpdate,
            }),
          );
        }
      } catch (error) {
        // console.error("Lỗi khi lấy trạng thái thiết bị:", error);
        dispatch(
          setDeviceStatus({
            isConnected: true,
            lastUpdate: new Date().toLocaleString(),
          }),
        );
      }
    };

    fetchDeviceStatus();
    const interval = setInterval(fetchDeviceStatus, 10000);
    return () => clearInterval(interval);
  }, [dispatch]);


  

  return (
    <Card className="shadow-sm rounded-md">
      <div className="flex items-center justify-between">
        <div className="flex gap-5 items-center">
          {isConnected ? (
            <WifiOutlined className="text-base text-green-500" />
          ) : (
            <DisconnectOutlined className="text-base text-red-500" />
          )}
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold">
              Trạng thái thiết bị ESP8266
            </span>
            <span className="text-sm text-neutral-500">
              {isConnected ? "Đang kết nối" : "Mất kết nối"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`rounded-full px-3 font-semibold ${isConnected ? "bg-black text-white" : "bg-red-500 text-white"}`}
          >
            {isConnected ? "Online" : "Offline"}
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-1">
              <ClockCircleOutlined />
              <span className="text-normal font-normal text-sm text-neutral-500">
                Cập nhật lúc: {lastUpdate}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
