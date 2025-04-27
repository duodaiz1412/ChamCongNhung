const AttendanceLog = require("../models/attendanceLogModel");
const User = require("../models/userModel"); // Cần để populate
const ExcelJS = require("exceljs");

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

const downloadExcel = async (req, res) => {
  try {
    const userIdFilter = req.query.userId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const filter = {};
    if (userIdFilter) {
      const user = await User.findOne({ userId: userIdFilter }, "_id");
      if (user) {
        filter.user = user._id;
      } else {
        return res.status(404).json({
          status: "error",
          message: "User not found.",
          statusCode: 404,
        });
      }
    }
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = endOfDay;
      }
    }

    const logs = await AttendanceLog.find(filter)
      .populate("user", "name msv userId")
      .sort({ timestamp: -1 })
      .lean();

    const totalLogs = await AttendanceLog.countDocuments(filter);

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance Logs");

    // Define columns
    worksheet.columns = [
      { header: "STT", key: "stt", width: 10 },
      { header: "Tên", key: "name", width: 20 },
      { header: "Thời gian", key: "time", width: 15 },
      { header: "Ngày", key: "date", width: 15 },
      { header: "Trạng thái", key: "eventType", width: 15 },
    ];

    // Add rows
    logs.forEach((log, index) => {
      worksheet.addRow({
        stt: totalLogs - index,
        name: log.user?.name || "Unknown",
        time: new Date(log.timestamp).toLocaleTimeString("vi-VN"),
        date: new Date(log.timestamp).toLocaleDateString("vi-VN"),
        eventType: log.eventType === "CHECK_IN" ? "Vào" : "Ra",
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_logs_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    // Write to buffer and send
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate Excel file.",
      statusCode: 500,
    });
  }
};

module.exports = {
  getLogs,
  downloadExcel,
};