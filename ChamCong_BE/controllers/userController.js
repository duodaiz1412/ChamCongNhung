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
      return res.status(409).json({
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

    res.json({ success: "success", statusCode: 200, data: updatedUser });
  } catch (error) {
    console.error(`Error updating user ${req.params.userId}:`, error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ status: "error", message: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({
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
        message: "No enrollment progress found for this ID",
      });
    }

    res.json({
      status: "success",
      data: progress,
    });
  } catch (error) {
    console.error("Error getting enrollment progress:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get enrollment progress",
    });
  }
};

// POST /api/enroll/request - Yêu cầu bắt đầu đăng ký vân tay
const requestEnrollment = async (req, res) => {
  const { name, msv } = req.body;
  const deviceId = req.query.deviceId;

  if (!deviceId) {
    return res
      .status(400)
      .json({ status: "error", message: "Device ID is required." });
  }
  if (!name) {
    return res
      .status(400)
      .json({ status: "error", message: "User name is required." });
  }
  if (!msv) {
    return res
      .status(400)
      .json({ status: "error", message: "MSV is required." });
  }
  if (!websocketService.clients.has(deviceId)) {
    return res.status(400).json({
      status: "error",
      message: `Device ${deviceId} is not connected.`,
    });
  }

  let availableId;
  try {
    // 1. Kiểm tra xem msv đã tồn tại trong DB chưa
    const existingUser = await User.findOne({ msv });
    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: `MSV ${msv} is already registered for another user.`,
      });
    }

    // 2. Tìm ID vị trí trống
    availableId = await findAvailableTemplateId();

    if (availableId === null) {
      return res.status(503).json({
        status: "error",
        message: "No available fingerprint slot found or sensor is full.",
      });
    }

    // Lưu thông tin tiến trình đăng ký
    websocketService.setEnrollmentProgress(availableId, {
      status: "processing",
      step: 0,
      message: "Bắt đầu quá trình đăng ký vân tay",
      name,
      msv,
      deviceId,
    });

    console.log(
      `Attempting to start enrollment for user ${name} with template ID ${availableId} on device ${deviceId}`
    );

    // Trả về availableId cho client ngay lập tức để kết nối SSE
    res.status(200).json({
      status: "processing",
      message: "Enrollment process started",
      data: {
        id: availableId,
        name,
        msv
      }
    });

    // Sử dụng requestEnrollmentOnDevice nhưng không await
    websocketService.requestEnrollmentOnDevice(deviceId, availableId)
      .then(async (enrollResponse) => {
        // Xử lý kết quả thành công từ ESP
        if (enrollResponse.status === "success") {
          const newUser = new User({
            name: name,
            msv: msv,
            id: availableId,
          });
          await newUser.save();

          // Cập nhật thông tin tiến trình
          websocketService.setEnrollmentProgress(availableId, {
            status: "success",
            step: 100,
            message: "Đăng ký vân tay thành công",
            name,
            msv,
            deviceId,
          });

          console.log(
            `Successfully enrolled and saved user ${name} with template ID ${availableId}`
          );
        }
      })
      .catch((error) => {
        console.error("Error during enrollment:", error);
        // Cập nhật thông tin tiến trình khi có lỗi
        websocketService.setEnrollmentProgress(availableId, {
          status: "error",
          step: 0,
          message: error.message || "Lỗi trong quá trình đăng ký vân tay",
          name,
          msv,
          deviceId,
        });
      });

  } catch (error) {
    console.error("Error setting up enrollment:", error);
    // Trả về lỗi cho client nếu có lỗi trong quá trình thiết lập
    if (error.message.includes("timed out")) {
      res.status(408).json({
        status: "error",
        message: `Enrollment timed out: ${error.message}`,
      });
    } else if (error.message.includes("Failed to send enroll command")) {
      res.status(502).json({ status: "error", message: error.message });
    } else if (error.code === 11000) {
      res.status(409).json({
        status: "error",
        message: `Duplicate key error saving user. Field: ${Object.keys(
          error.keyValue
        )}`,
      });
    } else if (
      error.message.includes(
        "Internal error while finding available template ID"
      )
    ) {
      res.status(500).json({ status: "error", message: error.message });
    } else {
      res.status(500).json({
        status: "error",
        message: error.message || "Enrollment failed.",
      });
    }
  }
};

// DELETE /api/users/:userId - Bắt đầu quá trình xóa người dùng/vân tay
const initiateDeleteUser = async (req, res) => {
  const userIdToDelete = req.params.userId;
  const deviceId = "ESP_CHAMCONG_01";
  // if (!deviceId) {
  //   return res
  //     .status(400)
  //     .json({
  //       status: "error",
  //       message: "Device ID is required for deletion.",
  //     });
  // }
  if (!websocketService.clients.has(deviceId)) {
    return res.status(400).json({
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
        { $set: { isActive: false } }, // Đặt là inactive và xóa liên kết vân tay
        { new: true }
      ).lean();

      console.log(
        `Successfully deleted fingerprint ${fingerprintTemplateId} from device. User ${userIdToDelete} status updated in DB.`
      );
      res.json({
        statusCode: 200,
        success: "success",
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
      res.status(408).json({
        status: "error",
        message: `Deletion timed out: ${error.message}`,
      });
    } else if (error.message.includes("Failed to send delete command")) {
      res.status(502).json({ status: "error", message: error.message });
    } else {
      // Các lỗi khác từ ESP (reject từ requestDeletionOnDevice) hoặc lỗi DB
      res.status(500).json({
        status: "error",
        message: error.message || "Deletion failed.",
      });
    }
  }
};

// GET /api/enroll/progress-stream/:id - Stream tiến trình đăng ký qua SSE
const streamEnrollmentProgress = async (req, res) => {
  const { id } = req.params;
  const enrollmentId = parseInt(id);

  if (isNaN(enrollmentId)) {
    return res.status(400).json({
      status: "error",
      message: "ID không hợp lệ",
    });
  }

  // Thêm headers CORS
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  console.log(`SSE client connected for enrollment ID ${enrollmentId}`);

  // Gửi tiến trình hiện tại ngay lập tức nếu có
  const currentProgress = websocketService.getEnrollmentProgress(enrollmentId);
  if (currentProgress) {
    console.log(`Sending initial progress for ID ${enrollmentId}:`, currentProgress);
    res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);
  } else {
    console.log(`No progress found for ID ${enrollmentId}, sending not_found status`);
    res.write(`data: ${JSON.stringify({ status: 'not_found', message: 'Không tìm thấy tiến trình đăng ký', step: 0 })}\n\n`);
  }

  // Lắng nghe sự kiện cập nhật tiến trình
  const progressListener = (id, progress) => {
    if (id === enrollmentId) {
      try {
        console.log(`[SSE] Sending enrollment progress update for ID ${id}: ${progress.status}, step ${progress.step}`);
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
        
        // Đóng kết nối sau khi hoàn thành hoặc lỗi
        if (progress.status === 'success' || progress.status === 'error') {
          console.log(`[SSE] Closing connection for ID ${id} due to status ${progress.status}`);
          websocketService.off('enrollmentProgress', progressListener);
          clearInterval(keepAliveInterval);
          res.end();
        }
      } catch (err) {
        console.error(`[SSE] Error sending progress update for ID ${id}:`, err);
      }
    }
  };

  websocketService.on('enrollmentProgress', progressListener);

  // Gửi keep-alive để tránh đóng kết nối
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (err) {
      console.error(`[SSE] Error sending keep-alive for ID ${enrollmentId}:`, err);
      websocketService.off('enrollmentProgress', progressListener);
      clearInterval(keepAliveInterval);
      res.end();
    }
  }, 20000);

  // Xử lý khi client ngắt kết nối
  req.on('close', () => {
    console.log(`SSE client disconnected from enrollment progress stream for ID ${enrollmentId}`);
    websocketService.off('enrollmentProgress', progressListener);
    clearInterval(keepAliveInterval);
    res.end();
  });
  
  // Xử lý lỗi kết nối
  res.on('error', (err) => {
    console.error(`Error on SSE response stream for enrollment ID ${enrollmentId}:`, err);
    websocketService.off('enrollmentProgress', progressListener);
    clearInterval(keepAliveInterval);
    res.end();
  });
};

module.exports = {
  getUsers,
  addUser,
  updateUser,
  requestEnrollment,
  initiateDeleteUser,
  getEnrollmentProgress,
  streamEnrollmentProgress,
};
