import {Alert, Button, Form, Input, message} from "antd";
import FormItem from "antd/es/form/FormItem";
import {ErrorMessage, Formik} from "formik";
import {useState, useEffect} from "react";
import "./index.scss";
import {CircleAlert, CircleCheckBig, Fingerprint} from "lucide-react";
import * as Yup from "yup";
import {useDispatch, useSelector} from "react-redux";
import {IRootState} from "@/redux/store";
import axios from "axios";

interface IRegister {
  name: string;
  msv: string;
  step: number;
}

export default function Register() {
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(0);
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

  const handleAddRegister = async (
    values: IRegister,
    {setSubmitting}: {setSubmitting: (isSubmitting: boolean) => void},
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
        // Bắt đầu theo dõi tiến trình đăng ký
        const templateId = response.data.data.id;
        pollEnrollmentProgress(templateId);
      }
    } catch (error: any) {
      setError(true);
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

  // Hàm theo dõi tiến trình đăng ký
  const pollEnrollmentProgress = async (templateId: number) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/enroll/progress/${templateId}`
      );

      if (response.data.status === "success") {
        const progress = response.data.data;
        console.log(progress);
        // Cập nhật step dựa trên trạng thái
        if (progress.status === "processing") {
          setStep(progress.step);
          // Tiếp tục theo dõi nếu đang trong quá trình đăng ký
          setTimeout(() => pollEnrollmentProgress(templateId), 1000);
        } else if (progress.status === "success") {
          setStep(4); // Hoàn thành
          setSuccess(true);
          message.success("Đăng ký vân tay thành công!");
        } else if (progress.status === "error") {
          setError(true);
          message.error(progress.message || "Đăng ký vân tay thất bại");
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin tiến trình:", error);
      setError(true);
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 0:
        return "Nhấn nút bắt đầu để bắt đầu đăng ký vân tay";
      case 1:
        return "Đặt ngón tay lần 1 lên cảm biến";
      case 2:
        return "Nhấc ngón tay ra khỏi cảm biến";
      case 3:
        return "Đặt ngón tay lần 2 lên cảm biến";
      case 4:
        return "Đăng ký vân tay thành công!";
      default:
        return "Đặt ngón tay lên cảm biến để đăng ký vân tay";
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
          description={`Đã đăng ký vân tay thành công cho ${name}`}
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
          description="Đăng ký vân tay thất bại"
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
            {({handleChange, isSubmitting, handleSubmit, values}) => {
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
                          disabled={isSubmitting || !isConnected}
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
                        disabled={isSubmitting || !isConnected}
                        value={values.msv}
                      />
                    </FormItem>
                    <ErrorMessage
                      name="msv"
                      component="div"
                      className="text-red-500"
                    />

                    <div className="flex justify-end mt-6">
                      <Button
                        className={`w-full ${!isConnected ? "bg-black" : "submit-button"} p-4 font-semibold h-9`}
                        type="primary"
                        htmlType="submit"
                        loading={isSubmitting}
                        disabled={!isConnected}
                      >
                        <Fingerprint className="w-4 h-4" />
                        Bắt đầu đăng ký vân tay
                      </Button>
                    </div>
                  </Form>
                </div>
              );
            }}
          </Formik>
        </div>
        <div className="register-image border border-gray rounded-md p-6 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500">
            <Fingerprint className="mx-auto h-16 w-16 mb-4 opacity-50" />
            <div className="text-center">{getStepMessage()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
