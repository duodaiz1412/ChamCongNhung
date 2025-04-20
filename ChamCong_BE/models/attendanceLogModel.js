const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventType = {
  CHECK_IN: "CHECK_IN",
  CHECK_OUT: "CHECK_OUT",
  SCAN: "SCAN",
};

const attendanceLogSchema = new mongoose.Schema(
  {
    user: {
      // Tham chiếu đến _id của User
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [EventType.CHECK_IN, EventType.CHECK_OUT, EventType.SCAN],
      default: EventType.SCAN,
    },
    // *** CẬP NHẬT ENUM Ở ĐÂY ***
    // method: {
    //   type: String,
    //   required: true, // Nên bắt buộc để biết chấm công bằng cách nào
    //   enum: ['fingerprint', 'face_check', 'card', 'manual', 'other'], // Thêm 'face_check'
    //   // default: 'fingerprint', // Bỏ default nếu không chắc chắn
    // },
  },
  { timestamps: { createdAt: "loggedAt" } }
); // Thời điểm log được ghi vào DB

attendanceLogSchema.index({ user: 1, timestamp: -1 });

const AttendanceLog = mongoose.model("AttendanceLog", attendanceLogSchema);

module.exports = AttendanceLog;
