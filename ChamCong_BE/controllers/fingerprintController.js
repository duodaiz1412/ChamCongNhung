const User = require('../models/userModel');
const AttendanceLog = require('../models/attendanceLogModel');

const EventType = {
    CHECK_IN: "CHECK_IN",
    CHECK_OUT: "CHECK_OUT",
    SCAN: "SCAN",
  };

const handleScanResult = async (deviceId, payload) => {
    console.log(`[${deviceId}] Received scan_result payload:`, JSON.stringify(payload));

    const { id, timestamp } = payload;

    if (id === undefined || id === null) {
        console.error(`[${deviceId}] Received invalid fingerprint template ID: ${id}`);
        return { status: 'error', message: 'Invalid fingerprint template ID' };
    }

    // Validate and assign timestamp
    let scanTimestamp;
    if (timestamp) {
        scanTimestamp = new Date(timestamp);
        if (isNaN(scanTimestamp.getTime())) {
            console.warn(`[${deviceId}] Invalid timestamp received: ${timestamp}. Using server time.`);
            scanTimestamp = new Date();
        } else {
            console.log(`[${deviceId}] Valid timestamp parsed: ${scanTimestamp.toISOString()}`);
        }
    } else {
        console.log(`[${deviceId}] No timestamp provided. Using server time.`);
        scanTimestamp = new Date();
    }

    try {
        // 1. Tìm User bằng ID vị trí vân tay
        const user = await User.findOne({ id: id, isActive: true });

        if (user) {
            console.log(`[${deviceId}] Fingerprint scan match: User ${user.name} (ID: ${id})`);

            // 2. Logic xác định Check-in/Check-out
            const startOfDay = new Date(scanTimestamp);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(scanTimestamp);
            endOfDay.setHours(23, 59, 59, 999);

            const lastLogToday = await AttendanceLog.findOne({
                user: user._id,
                timestamp: { $gte: startOfDay, $lte: endOfDay }
            }).sort({ timestamp: -1 });

            let eventType = EventType.CHECK_IN; // Mặc định là check-in
            if (lastLogToday && lastLogToday.eventType === EventType.CHECK_IN) {
                eventType = EventType.CHECK_OUT; // Nếu log cuối là check-in -> giờ là check-out
            }

            // 3. Tạo bản ghi AttendanceLog
            const newLog = new AttendanceLog({
                user: user._id,
                timestamp: scanTimestamp,
                eventType: eventType,
                deviceId: deviceId, // Include deviceId for tracking
                fingerprintTemplateIdUsed: id // Include fingerprint ID
            });
            await newLog.save();
            console.log(`[${deviceId}] Attendance log saved for ${user.name}: ${eventType}`);

            return { status: 'success', message: `Attendance logged for ${user.name}: ${eventType}` };

        } else {
            console.warn(`[${deviceId}] No active user found for fingerprint template ID: ${id}`);
            return { status: 'error', message: 'No active user found for this fingerprint' };
        }

    } catch (error) {
        console.error(`[${deviceId}] Error processing scan result for ID ${id}:`, error);
        return { status: 'error', message: 'Failed to process scan result' };
    }
};

module.exports = {
    handleScanResult,
};