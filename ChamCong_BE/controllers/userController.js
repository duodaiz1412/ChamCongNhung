// controllers/userController.js
const User = require("../models/userModel");
const websocketService = require("../services/websocketService");
const { v4: uuidv4 } = require("uuid"); // Import nếu bạn dùng userId tự sinh

// Thêm Map để lưu trữ thông tin tiến trình đăng ký
const enrollmentProgress = new Map();

// --- Hàm tìm ID vân tay trống ---
const MAX_FINGERPRINT_CAPACITY = 127;

async function findAvailableTemplateId() {
  try {
    console.log("Searching for available fingerprint template ID...");

    const usedUsers = await User.find({ id: { $ne: null } }, "id -_id").lean();

    const usedIdSet = new Set(usedUsers.map((u) => u.id));
    console.log(
      `Currently used IDs in DB: ${[...usedIdSet]
        .sort((a, b) => a - b)
        .join(", ")}`
    );

    let availableId = 1;

    while (availableId <= MAX_FINGERPRINT_CAPACITY) {
      const isUsedInDb = usedIdSet.has(availableId);
      const isPendingEnroll =
        websocketService.pendingEnrollment.has(availableId);

      if (!isUsedInDb && !isPendingEnroll) {
        console.log(`Found available template ID: ${availableId}`);
        return availableId; // Tìm thấy ID phù hợp!
      }

      // Ghi log nếu ID bị bỏ qua
      // if (isUsedInDb) {
      //     console.log(`ID ${availableId} is already used in DB.`);
      // }
      // if (isPendingEnroll) {
      //     console.log(`ID ${availableId} is currently pending enrollment.`);
      // }

      availableId++;
    }

    // Nếu vòng lặp kết thúc mà không tìm thấy ID nào
    console.warn(
      `No available template ID found within capacity (${MAX_FINGERPRINT_CAPACITY}). Sensor might be full or all available IDs are pending.`
    );
    return null;
  } catch (error) {
    console.error("Error finding available template ID:", error);
    throw new Error("Internal error while finding available template ID.");
  }
}

// --- API Controllers ---

// GET /api/users - Lấy danh sách người dùng (có phân trang, lọc)
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filter = {};
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === "true";
    }
    // Thêm các bộ lọc khác nếu cần (ví dụ: tìm kiếm theo tên, msv)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i"); // Tìm kiếm không phân biệt hoa thường
      filter.$or = [
        // Tìm trong nhiều trường
        { name: searchRegex },
        { msv: searchRegex },
        { userId: searchRegex }, // Nếu muốn tìm theo userId
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: "success",
      statusCode: 200,
      message: "Logs fetched successfully",
      data: {
        data: users,
        page,
        pageSize: limit,
        totalPages,
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch users." });
  }
};

// POST /api/users - Thêm người dùng mới (API cơ bản, không kèm đăng ký vân tay)
const addUser = async (req, res) => {
  try {
    const { name, msv } = req.body; // Lấy thông tin từ request body
    // Trường 'id' (vân tay) sẽ là null/undefined ban đầu

    // userId sẽ tự sinh bằng default: uuidv4() trong model
    const newUser = new User({
      name,
      msv,
      // id: null // Mặc định là không có
      // isActive mặc định là true
    });

    await newUser.save();
    res.status(201).json({ status: "success", data: newUser });
  } catch (error) {
    console.error("Error adding user:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({
          status: "error",
          message: `Duplicate key error. Field: ${Object.keys(error.keyValue)}`,
        });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ status: "error", message: error.message });
    }
    res.status(500).json({ status: "error", message: "Failed to add user." });
  }
};

// PUT /api/users/:userId - Cập nhật thông tin người dùng
const updateUser = async (req, res) => {
  try {
    const userIdToUpdate = req.params.userId;
    const updateData = req.body;

    // Ngăn chặn cập nhật các trường không mong muốn
    delete updateData.id; // Không cho sửa ID vân tay qua API này
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedUser = await User.findOneAndUpdate(
      { userId: userIdToUpdate },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    res.json({ status: "success", data: updatedUser });
  } catch (error) {
    console.error(`Error updating user ${req.params.userId}:`, error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ status: "error", message: error.message });
    }
    if (error.code === 11000) {
      return res
        .status(409)
        .json({
          status: "error",
          message: `Duplicate key error during update. Field: ${Object.keys(
            error.keyValue
          )}`,
        });
    }
    res
      .status(500)
      .json({ status: "error", message: "Failed to update user." });
  }
};

// GET /api/enroll/progress/:id - Lấy thông tin tiến trình đăng ký
const getEnrollmentProgress = async (req, res) => {
    const { id } = req.params;
    
    try {
        const progress = websocketService.getEnrollmentProgress(parseInt(id));
        if (!progress) {
            return res.status(404).json({
                status: "error",
                message: "No enrollment progress found for this ID"
            });
        }

        res.json({
            status: "success",
            data: progress
        });
    } catch (error) {
        console.error("Error getting enrollment progress:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to get enrollment progress"
        });
    }
};

// POST /api/enroll/request - Yêu cầu bắt đầu đăng ký vân tay
const requestEnrollment = async (req, res) => {
    const { name, msv } = req.body;
    const deviceId = req.query.deviceId;

    if (!deviceId) {
        return res.status(400).json({ status: "error", message: "Device ID is required." });
    }
    if (!name) {
        return res.status(400).json({ status: "error", message: "User name is required." });
    }
    if (!msv) {
        return res.status(400).json({ status: "error", message: "MSV is required." });
    }
    if (!websocketService.clients.has(deviceId)) {
        return res.status(400).json({
            status: "error",
            message: `Device ${deviceId} is not connected.`
        });
    }

    let availableId;
    try {
        // 1. Kiểm tra xem msv đã tồn tại trong DB chưa
        const existingUser = await User.findOne({ msv });
        if (existingUser) {
            return res.status(409).json({
                status: "error",
                message: `MSV ${msv} is already registered for another user.`
            });
        }

        // 2. Tìm ID vị trí trống
        availableId = await findAvailableTemplateId();

        if (availableId === null) {
            return res.status(503).json({
                status: "error",
                message: "No available fingerprint slot found or sensor is full."
            });
        }

        // Lưu thông tin tiến trình đăng ký
        websocketService.setEnrollmentProgress(availableId, {
            status: "processing",
            step: 0,
            message: "Bắt đầu quá trình đăng ký vân tay",
            name,
            msv,
            deviceId
        });

        console.log(`Attempting to start enrollment for user ${name} with template ID ${availableId} on device ${deviceId}`);

        // 3. Gửi yêu cầu tới ESP và chờ phản hồi
        const enrollResponse = await websocketService.requestEnrollmentOnDevice(deviceId, availableId);

        // 4. Xử lý kết quả thành công từ ESP
        if (enrollResponse.status === "success") {
            const newUser = new User({
                name: name,
                msv: msv,
                id: availableId
            });
            await newUser.save();
            
            // Cập nhật thông tin tiến trình
            websocketService.setEnrollmentProgress(availableId, {
                status: "success",
                step: 100,
                message: "Đăng ký vân tay thành công",
                name,
                msv,
                deviceId
            });

            console.log(`Successfully enrolled and saved user ${name} with template ID ${availableId}`);
            res.status(201).json({
                status: "success",
                message: "Enrollment successful!",
                data: newUser
            });
        }
    } catch (error) {
        console.error("Error during enrollment request:", error);
        // Cập nhật thông tin tiến trình khi có lỗi
        if (availableId) {
            websocketService.setEnrollmentProgress(availableId, {
                status: "error",
                step: 0,
                message: error.message,
                name,
                msv,
                deviceId
            });
        }
        if (error.message.includes("timed out")) {
            res
                .status(408)
                .json({
                    status: "error",
                    message: `Enrollment timed out: ${error.message}`
                });
        } else if (error.message.includes("Failed to send enroll command")) {
            res.status(502).json({ status: "error", message: error.message });
        } else if (error.code === 11000) {
            res.status(409).json({
                status: "error",
                message: `Duplicate key error saving user. Field: ${Object.keys(
                    error.keyValue
                )}`
            });
        } else if (
            error.message.includes(
                "Internal error while finding available template ID"
            )
        ) {
            res.status(500).json({ status: "error", message: error.message });
        } else {
            res
                .status(500)
                .json({
                    status: "error",
                    message: error.message || "Enrollment failed."
                });
        }
    }
};

// DELETE /api/users/:userId - Bắt đầu quá trình xóa người dùng/vân tay
const initiateDeleteUser = async (req, res) => {
  const userIdToDelete = req.params.userId;
  const deviceId = req.query.deviceId;

  if (!deviceId) {
    return res
      .status(400)
      .json({
        status: "error",
        message: "Device ID is required for deletion.",
      });
  }
  if (!websocketService.clients.has(deviceId)) {
    return res
      .status(400)
      .json({
        status: "error",
        message: `Device ${deviceId} is not connected.`,
      });
  }

  try {
    // 1. Tìm user và ID vị trí vân tay
    const user = await User.findOne({ userId: userIdToDelete });

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }
    // Nếu user không có ID vân tay thì không cần gửi lệnh xóa tới ESP
    if (!user.id) {
      // Tùy chọn: Xóa user khỏi DB luôn hoặc chỉ cập nhật isActive
      await User.findOneAndUpdate(
        { userId: userIdToDelete },
        { $set: { isActive: false } }
      );
      // await User.deleteOne({ userId: userIdToDelete });
      console.log(
        `User ${userIdToDelete} had no fingerprint assigned. Marked as inactive (or deleted).`
      );
      return res.json({
        status: "success",
        message:
          "User had no fingerprint assigned. Marked as inactive (or deleted).",
      });
    }

    const fingerprintTemplateId = user.id;
    console.log(
      `Attempting to delete fingerprint ID ${fingerprintTemplateId} for user ${user.name} (${userIdToDelete}) on device ${deviceId}`
    );

    // 2. Gửi yêu cầu xóa tới ESP và chờ phản hồi
    const deleteResponse = await websocketService.requestDeletionOnDevice(
      deviceId,
      fingerprintTemplateId
    );

    // 3. Nếu ESP xác nhận xóa thành công
    if (deleteResponse.status === "success") {
      // Cập nhật trạng thái user trong DB (khuyến nghị)
      const updatedUser = await User.findOneAndUpdate(
        { userId: userIdToDelete },
        { $set: { isActive: false, id: null } }, // Đặt là inactive và xóa liên kết vân tay
        { new: true }
      ).lean();

      console.log(
        `Successfully deleted fingerprint ${fingerprintTemplateId} from device. User ${userIdToDelete} status updated in DB.`
      );
      res.json({
        status: "success",
        message:
          "Fingerprint deleted successfully from device and user updated.",
        data: updatedUser,
      });
    }
    // Không cần else, vì nếu không success, promise đã reject và bị bắt bởi catch
  } catch (error) {
    console.error(
      `Error initiating deletion for user ${userIdToDelete}:`,
      error
    );
    if (error.message.includes("timed out")) {
      res
        .status(408)
        .json({
          status: "error",
          message: `Deletion timed out: ${error.message}`,
        });
    } else if (error.message.includes("Failed to send delete command")) {
      res.status(502).json({ status: "error", message: error.message });
    } else {
      // Các lỗi khác từ ESP (reject từ requestDeletionOnDevice) hoặc lỗi DB
      res
        .status(500)
        .json({
          status: "error",
          message: error.message || "Deletion failed.",
        });
    }
  }
};

module.exports = {
  getUsers,
  addUser,
  updateUser,
  requestEnrollment,
  initiateDeleteUser,
  getEnrollmentProgress
};
