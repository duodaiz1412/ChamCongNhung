// models/userModel.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
    required: true,
  },
  id: { // ID vị trí vân tay AS608
    type: Number,
    // required: true, // Có thể không bắt buộc ngay khi tạo user
    unique: true,
    sparse: true, // Cho phép null/undefined nhưng nếu có giá trị thì phải unique
    index: true,
    min: 1,
  },
  name: {
    type: String,
    required: [true, 'Tên người dùng là bắt buộc.'],
    trim: true,
  },
  msv: {
    type: String,
    required: false,
    trim: true,
  },
  isActive: {
      type: Boolean,
      default: true,
  }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);
module.exports = User;
