const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceLogSchema = new mongoose.Schema({
  user: { // Tham chiếu đến _id của User
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  timestamp: { // Thời điểm chấm công thực tế
    type: Date,
    required: true,
    index: true,
    default: Date.now,
  },
  eventType: {
    type: String,
    required: true,
    enum: ['check-in', 'check-out', 'scan'],
    default: 'scan',
  },
  // *** CẬP NHẬT ENUM Ở ĐÂY ***
  // method: { 
  //   type: String,
  //   required: true, // Nên bắt buộc để biết chấm công bằng cách nào
  //   enum: ['fingerprint', 'face_check', 'card', 'manual', 'other'], // Thêm 'face_check'
  //   // default: 'fingerprint', // Bỏ default nếu không chắc chắn
  // },

}, { timestamps: { createdAt: 'loggedAt' } }); // Thời điểm log được ghi vào DB

attendanceLogSchema.index({ user: 1, timestamp: -1 });

const AttendanceLog = mongoose.model('AttendanceLog', attendanceLogSchema);

module.exports = AttendanceLog;