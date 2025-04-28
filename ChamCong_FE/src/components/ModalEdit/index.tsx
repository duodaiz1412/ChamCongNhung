import ApiUser from "@/api/ApiUser";
import {IUser} from "@/types";
import {useMutation} from "@tanstack/react-query";
import {Modal, Button, Form, Input, Row, Col, Typography} from "antd";
import {toast} from "react-toastify";
import {useEffect} from "react";
import {convertDate} from "@/utils/timeUtils";

interface ModalEditProps {
  data?: IUser;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title?: string;
  loading?: boolean;
}

export default function ModalEdit({
  data,
  onClose,
  onConfirm,
  open,
  title = "Chỉnh sửa người dùng",
  loading: externalLoading = false,
}: ModalEditProps): JSX.Element {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        name: data.name || "",
        msv: data.msv || "",
      });
    }
  }, [open, data, form]);

  const {mutateAsync: updateUserMutationAsync, isPending} = useMutation({
    mutationFn: (values: Partial<IUser>) =>
      ApiUser.updateUser(data?.userId || "", values),
    onSuccess: () => {
      toast.success("Cập nhật người dùng thành công");
      onConfirm();
      onClose();
    },
  });

  const handleSubmit = async (values: Partial<IUser>) => {
    if (!data?.userId) {
      toast.error("Không tìm thấy ID người dùng");
      return;
    }

    try {
      await updateUserMutationAsync(values);
      onConfirm();
      onClose();
    } catch {
      // Vẫn cập nhật UI để phản ánh trạng thái mới nhất
      onConfirm();
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: data?.name || "",
          msv: data?.msv || "",
        }}
      >
        <Form.Item
          name="name"
          label="Tên"
          rules={[{required: true, message: "Vui lòng nhập tên người dùng"}]}
        >
          <Input placeholder="Nhập tên người dùng" />
        </Form.Item>

        <Form.Item name="msv" label="Mã sinh viên">
          <Input placeholder="Nhập mã sinh viên" />
        </Form.Item>

        {/* Hiển thị thông tin ngày tạo và cập nhật */}
        <div className="mb-4">
          <Typography.Title level={5} className="mb-2">Thông tin thêm</Typography.Title>
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-md">
            <div>
              <Typography.Text type="secondary">Ngày tạo:</Typography.Text>
              <div>{convertDate(data?.createdAt)}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Cập nhật lần cuối:</Typography.Text>
              <div>{convertDate(data?.updatedAt)}</div>
            </div>
          </div>
        </div>

        <Row justify="end" gutter={8}>
          <Col>
            <Button onClick={onClose}>Hủy</Button>
          </Col>
          <Col>
            <Button
              type="primary"
              htmlType="submit"
              className="bg-blue-500"
              loading={isPending || externalLoading}
            >
              Lưu
            </Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
