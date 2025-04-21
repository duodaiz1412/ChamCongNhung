"use client";

import {useEffect} from "react";
import {Card} from "antd";
import {
  WifiOutlined,
  DisconnectOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {useDispatch, useSelector} from "react-redux";
import {IRootState} from "@/redux/store";
import {setDeviceStatus} from "@/redux/slices/deviceSlice";
import "./index.scss";
import {convertDateTime} from "@/utils/timeUtils";

export default function DeviceStatus() {
  const dispatch = useDispatch();
  const {isConnected, lastUpdate} = useSelector(
    (state: IRootState) => state.device,
  );

  useEffect(() => {
    const eventSource = new EventSource(
      "http://localhost:3000/api/device-status",
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      dispatch(
        setDeviceStatus({
          isConnected: data.isConnected,
          lastUpdate: data.lastUpdate,
        }),
      );
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
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
                Cập nhật lúc: {convertDateTime(lastUpdate)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
