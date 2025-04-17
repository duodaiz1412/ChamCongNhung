// controllers/fingerprintController.js
const User = require('../models/userModel');
const AttendanceLog = require('../models/attendanceLogModel');

const handleScanResult = async (deviceId, payload) => {
    const { id, timestamp } = payload;

    if (id === undefined || id === null) {
        console.error(`[${deviceId}] Received invalid fingerprint template ID: ${id}`);
        return;
    }

    const scanTimestamp = timestamp ? new Date(timestamp) : new Date(); // Dùng timestamp từ thiết bị nếu có

    try {
        // 1. Tìm User bằng ID vị trí vân tay
        const user = await User.findOne({ id: id, isActive: true });

        if (user) {
            console.log(`[${deviceId}] Fingerprint scan match: User ${user.name} (ID: ${id})`);

            // 2. Logic xác định Check-in/Check-out (Ví dụ đơn giản)
            //    Cần logic phức tạp hơn dựa trên log cuối cùng của user trong ngày, ca làm việc...
            const startOfDay = new Date(scanTimestamp);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(scanTimestamp);
            endOfDay.setHours(23, 59, 59, 999);

            const lastLogToday = await AttendanceLog.findOne({
                user: user._id,
                timestamp: { $gte: startOfDay, $lte: endOfDay }
            }).sort({ timestamp: -1 });

            let eventType = 'check-in'; // Mặc định là check-in
            if (lastLogToday && lastLogToday.eventType === 'check-in') {
                eventType = 'check-out'; // Nếu log cuối là check-in -> giờ là check-out
            }
             // Có thể thêm các quy tắc khác (vd: thời gian tối thiểu giữa check-in/out)

            // 3. Tạo bản ghi AttendanceLog
            const newLog = new AttendanceLog({
                user: user._id,
                timestamp: scanTimestamp,
                eventType: eventType,
                // method: 'fingerprint',
                // deviceId: deviceId,
                // fingerprintTemplateIdUsed: id
            });
            await newLog.save();
            console.log(`[${deviceId}] Attendance log saved for ${user.name}: ${eventType}`);

            // TODO: Gửi thông báo về Frontend nếu cần (qua WS riêng của FE hoặc SSE khác)

        } else {
            console.warn(`[${deviceId}] No active user found for fingerprint template ID: ${id}`);
        }

    } catch (error) {
        console.error(`[${deviceId}] Error processing scan result for ID ${id}:`, error);
    }
};

module.exports = {
    handleScanResult,
};