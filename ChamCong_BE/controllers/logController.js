const AttendanceLog = require("../models/attendanceLogModel");
const User = require("../models/userModel"); // Cần để populate

const getLogs = async (req, res) => {
  try {
    // Lấy tham số query (ví dụ: ?page=1&pageSize=20&userId=abc&startDate=...&endDate=...)
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const userIdFilter = req.query.userId; // Lọc theo userId của hệ thống
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const filter = {};
    // Xây dựng bộ lọc động
    if (userIdFilter) {
      // Cần tìm _id của user từ userId trước khi lọc AttendanceLog
      const user = await User.findOne({ userId: userIdFilter }, "_id");
      if (user) {
        filter.user = user._id; // Lọc theo ObjectId của user
      } else {
        // Nếu không tìm thấy user với userId đó, trả về mảng rỗng
        return res.json({
          status: "success",
          data: [],
          page: page,
          pageSize: pageSize,
          totalPages: 0,
          totalLogs: 0,
        });
      }
    }
    if (startDate || endDate) {
      filter.timestamp = {}; // Dùng timestamp để lọc theo ngày
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) {
        // Đảm bảo bao gồm cả ngày kết thúc
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = endOfDay;
      }
    }

    const skip = (page - 1) * pageSize;

    const logs = await AttendanceLog.find(filter)
      .populate("user", "name msv userId") // Lấy kèm thông tin user cần thiết
      .sort({ timestamp: -1 }) // Sắp xếp mới nhất lên đầu
      .skip(skip)
      .limit(pageSize)
      .lean(); // Trả về plain JS objects

    const totalLogs = await AttendanceLog.countDocuments(filter);
    const totalPages = Math.ceil(totalLogs / pageSize);

    res.json({
      success: true,
      statusCode: 200,
      message: "Logs fetched successfully",
      data: {
        data: logs,
        page,
        pageSize,
        totalPages,
        totalLogs,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance logs:", error);
    res.json({
      status: "error",
      message: "Failed to fetch logs.",
      statusCode: 500,
    });
  }
};

module.exports = {
  getLogs,
};
