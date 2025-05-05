import {Alert, Button, Form, Input, message, Progress} from "antd";
import FormItem from "antd/es/form/FormItem";
import {ErrorMessage, Formik} from "formik";
import {useEffect, useRef, useState} from "react";
import "./index.scss";
import {
  CheckCircle,
  CircleAlert,
  CircleCheckBig,
  Fingerprint,
} from "lucide-react";
import * as Yup from "yup";
import {useSelector} from "react-redux";
import {IRootState} from "@/redux/store";
import axios from "axios";

interface IRegister {
  name: string;
  msv: string;
  step: number;
}

interface IEnrollmentProgress {
  status: "processing" | "success" | "error" | "not_found";
  step: number;
  message: string;
  name?: string;
  msv?: string;
  deviceId?: string;
}

export default function Register() {
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [progress, setProgress] = useState<IEnrollmentProgress | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const {isConnected} = useSelector((state: IRootState) => state.device);
  const initialValues: IRegister = {
    name: "",
    msv: "",
    step: 0,
  };
  const validationSchema = Yup.object({
    name: Yup.string().required("Tên là bắt buộc"),
    msv: Yup.string().required("Mã sinh viên là bắt buộc"),
  });

  // Đóng kết nối SSE khi component unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  // Khi enrollmentId thay đổi, kết nối với SSE để lắng nghe cập nhật
  useEffect(() => {
    // Đóng kết nối SSE hiện tại nếu có
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    if (enrollmentId) {
      // Tạo kết nối SSE mới
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const eventSource = new EventSource(
        `${API_URL}/api/enroll/progress-stream/${enrollmentId}`,
      );

      // Xử lý sự kiện mở kết nối
      eventSource.onopen = () => {};

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as IEnrollmentProgress;
          setProgress(data);

          if (data.status === "success") {
            setSuccess(true);
            setError(false);
            message.success("Đăng ký vân tay thành công!");
            eventSource.close();
          } else if (data.status === "error") {
            setError(true);
            setSuccess(false);
            message.error(`Đăng ký thất bại: ${data.message}`);
            eventSource.close();
          }
        } catch {
          message.error("Lỗi xử lý dữ liệu từ máy chủ");
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        message.error("Mất kết nối với máy chủ đăng ký");
        eventSource.close();
      };

      sseRef.current = eventSource;
    }
  }, [enrollmentId]);

  const handleAddRegister = async (
    values: IRegister,
    {
      setSubmitting,
      resetForm,
    }: {setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void},
  ) => {
    try {
      const response = await axios.post(
        "http://localhost:3000/api/enroll/request",
        {
          name: values.name,
          msv: values.msv,
        },
        {
          params: {
            deviceId: "ESP_CHAMCONG_01",
          },
        },
      );

      if (response.data.status === "success") {
        // Nếu đã đăng ký thành công ngay lập tức
        setSuccess(true);
        setError(false);
        message.success("Đăng ký thành công!");
        resetForm();
      } else if (response.data.status === "processing") {
        // Khi nhận được ID từ server, bắt đầu kết nối SSE
        message.info("Đang bắt đầu quá trình đăng ký vân tay...");
        if (response.data.data && response.data.data.id) {
          setEnrollmentId(response.data.data.id);
          setSuccess(false);
          setError(false);
        }
      }
    } catch (error: any) {
      setError(true);
      setSuccess(false);

      if (error.response) {
        switch (error.response.status) {
          case 400:
            message.error(
              "Thiếu thông tin bắt buộc hoặc thiết bị không kết nối",
            );
            break;
          case 503:
            message.error("Không còn vị trí trống để đăng ký vân tay");
            break;
          case 408:
            message.error("Quá thời gian chờ đăng ký");
            break;
          case 502:
            message.error("Không thể gửi lệnh đăng ký tới thiết bị");
            break;
          case 409:
            message.error("Thông tin đã tồn tại trong hệ thống");
            break;
          default:
            message.error(
              "Đăng ký thất bại: " +
                (error.response.data?.message || "Lỗi không xác định"),
            );
        }
      } else {
        message.error("Lỗi kết nối: " + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-gray rounded-md p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center">
          <div className="text-2xl font-bold">Đăng Ký Vân Tay</div>
        </div>
        <div className="text-sm text-gray-500">
          Đăng ký vân tay để sử dụng hệ thống điểm danh vân tay
        </div>
      </div>
      {success && (
        <Alert
          message="Thành công"
          description={`Đã đăng ký vân tay thành công cho ${progress?.name || ""}`}
          type="success"
          showIcon
          className="register-success"
          icon={<CircleCheckBig />}
        />
      )}
      {error && (
        <Alert
          message="Lỗi"
          className="register-error"
          description={progress?.message || "Đăng ký vân tay thất bại"}
          type="error"
          showIcon
          icon={<CircleAlert />}
        />
      )}
      {!isConnected && (
        <Alert
          message="Lỗi"
          className="not-connected"
          description="Không có kết nối với thiết bị"
          type="warning"
          showIcon
          icon={<CircleAlert />}
        />
      )}

      {progress && progress.status === "processing" && (
        <div className="enrollment-progress">
          <Alert
            message="Đang đăng ký"
            description={progress.message || "Đang xử lý..."}
            type="info"
            showIcon
          />
          <Progress
            percent={progress.step * 33}
            status={
              progress.status === "processing"
                ? "active"
                : progress.status === "success"
                  ? "success"
                  : "exception"
            }
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="register-form">
          <Formik
            initialValues={initialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={handleAddRegister}
            validateOnBlur={true}
            validateOnChange={true}
          >
            {({
              handleChange,
              isSubmitting,
              handleSubmit,
              values,
              resetForm,
            }) => {
              const handleResetAll = () => {
                // Reset form
                resetForm({values: initialValues});
                // Reset states
                setSuccess(false);
                setError(false);
                setEnrollmentId(null);
                setProgress(null);
              };
              
              return (
                <div className="flex flex-col gap-2">
                  <Form layout="vertical" onFinish={handleSubmit}>
                    <div className="flex flex-col mb-3">
                      <FormItem
                        label="Họ và tên"
                        name="name"
                        className="font-semibold"
                      >
                        <Input
                          placeholder="Nhập tên"
                          name="name"
                          onChange={handleChange}
                          disabled={
                            isSubmitting ||
                            !isConnected ||
                            progress?.status === "processing"
                          }
                          value={values.name}
                        />
                      </FormItem>
                      <ErrorMessage
                        name="name"
                        component="div"
                        className="text-red-500"
                      />
                    </div>

                    <FormItem
                      label="Mã sinh viên"
                      name="msv"
                      className="font-semibold"
                    >
                      <Input
                        placeholder="Nhập mã sinh viên"
                        name="msv"
                        onChange={handleChange}
                        disabled={
                          isSubmitting ||
                          !isConnected ||
                          progress?.status === "processing"
                        }
                        value={values.msv}
                      />
                    </FormItem>
                    <ErrorMessage
                      name="msv"
                      component="div"
                      className="text-red-500"
                    />

                    <div className="flex justify-end mt-6">
                      {success ? (
                        <Button
                          className="w-full submit-button p-4 font-semibold h-9"
                          type="primary"
                          onClick={handleResetAll}
                        >
                          <Fingerprint className="w-4 h-4" />
                          Đăng ký người mới
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${!isConnected ? "bg-black" : "submit-button"} p-4 font-semibold h-9`}
                          type="primary"
                          htmlType="submit"
                          loading={isSubmitting}
                          disabled={
                            !isConnected || progress?.status === "processing"
                          }
                        >
                          <Fingerprint className="w-4 h-4" />
                          Bắt đầu đăng ký vân tay
                        </Button>
                      )}
                    </div>
                  </Form>
                </div>
              );
            }}
          </Formik>
        </div>
        <div className="register-image border border-gray rounded-md p-6 flex flex-col items-center justify-center">
          <div className="text-sm">
            {progress?.status === "processing" && progress.step === 1 && (
              <div>
                <Fingerprint className="mx-auto h-16 w-16 mb-4 animate-pulse" />
                <div className="text-center flex flex-col gap-2">
                  Đặt ngón tay lên cảm biến lần 1.
                  <span className="text-sm text-gray-500">
                    Giữ ngón tay cho đến khi quá trình quét hoàn tất.
                  </span>
                </div>
              </div>
            )}
            {progress?.status === "processing" && progress.step === 2 && (
              <div>
                <Fingerprint className="mx-auto h-16 w-16 mb-4 animate-pulse" />
                <div className="text-center flex flex-col gap-2">
                  Bỏ ngón tay ra và đặt lại ngón tay lên cảm biến lần 2.
                </div>
              </div>
            )}
            {progress?.status === "processing" && progress.step === 3 && (
              <div>
                <Fingerprint className="mx-auto h-16 w-16 mb-4 text-green-600 animate-pulse" />
                <div className="text-center flex flex-col text-gray-500 gap-2">
                  Đặt ngón tay lên cảm biến lần 2.
                  <span className="text-sm">
                    Giữ ngón tay cho đến khi quá trình quét hoàn tất.
                  </span>
                </div>
              </div>
            )}
            {progress?.status === "success" && (
              <div className="text-center">
                <CheckCircle className="mx-auto h-16 w-16 mb-4 text-green-600" />
                <div className="text-center text-lg flex flex-col text-green-600 gap-2">
                  Đăng ký vân tay thành công!
                  <span className="text-sm font-normal">
                    Người dùng đã được thêm vào hệ thống
                  </span>
                </div>
              </div>
            )}
            {(!progress || !progress.status) && (
              <div className="text-center">
                <Fingerprint className="mx-auto h-16 w-16 opacity-50 mb-4" />
                <div className="text-center flex flex-col text-gray-500 gap-2">
                  Nhập thông tin và bắt đầu quá trình đăng ký vân tay
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
