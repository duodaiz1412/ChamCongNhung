"use client";

import {useState, useEffect} from "react";
import {Card} from "antd";
import {
  WifiOutlined,
  DisconnectOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";


export function DeviceStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    // Simulate connection changes
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.2); // 80% chance of being connected
      setLastSeen(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
          {lastSeen && (
            <div className="flex items-center gap-1">
              <ClockCircleOutlined />
              <span className="text-normal font-normal text-sm text-neutral-500">
                Cập nhật lúc: {lastSeen}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
