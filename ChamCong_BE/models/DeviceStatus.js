const mongoose = require('mongoose');

const deviceStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'error'],
    default: 'disconnected'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DeviceStatus', deviceStatusSchema); 