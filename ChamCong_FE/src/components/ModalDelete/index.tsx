import ApiUser from "@/api/ApiUser";
import {IUser} from "@/types";
import {useMutation} from "@tanstack/react-query";
import {Modal, Button, Space, Typography} from "antd";
import {toast} from "react-toastify";

interface ModalDeleteProps {
  data?: IUser;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title?: string;
  loading?: boolean;
}

export default function ModalDelete({
  data,
  onClose,
  onConfirm,
  open,
  title = "Xác nhận xóa",
  loading: externalLoading = false,
}: ModalDeleteProps): JSX.Element {
  const {mutateAsync: deleteUserMutationAsync, isPending} = useMutation({
    mutationFn: ApiUser.deleteUser,
    onSuccess: () => {
      toast.success("Xóa người dùng thành công");
      onConfirm();
      onClose();
    },
  });

  const handleDelete = async () => {
    if (!data?.userId) {
      toast.error("Không tìm thấy ID người dùng");
      return;
    }
    try {
      await deleteUserMutationAsync(data.userId);
      // Đảm bảo modal đóng ngay cả khi không vào onSuccess
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
    >
      <Typography.Paragraph>
        Bạn có chắc chắn muốn xóa{" "}
        <strong>{data?.name || data?.msv || "người dùng này"}</strong>?
      </Typography.Paragraph>
      <Typography.Paragraph type="warning">
        Hành động này không thể hoàn tác.
      </Typography.Paragraph>
      <Space
        style={{display: "flex", justifyContent: "flex-end", marginTop: 16}}
      >
        <Button onClick={onClose}>Hủy</Button>
        <Button
          type="primary"
          danger
          loading={isPending || externalLoading}
          onClick={handleDelete}
        >
          Xóa
        </Button>
      </Space>
    </Modal>
  );
}
