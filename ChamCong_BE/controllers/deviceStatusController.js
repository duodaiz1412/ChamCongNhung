const DeviceStatus = require('../models/DeviceStatus');
const websocketService = require('../services/websocketService');

exports.getDeviceStatus = async (req, res) => {
  try {
    const deviceStatus = await DeviceStatus.findOne({ deviceId: 'main' });
    if (!deviceStatus) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Device status not found' 
      });
    }
    res.json({
      status: 'success',
      data: deviceStatus
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

exports.updateDeviceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const deviceStatus = await DeviceStatus.findOneAndUpdate(
      { deviceId: 'main' },
      { 
        status,
        lastUpdated: new Date()
      },
      { 
        new: true,
        upsert: true 
      }
    );
    res.json({
      status: 'success',
      data: deviceStatus
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

exports.getCurrentDeviceStatus = async (req, res) => {
  try {
    const clientCount = websocketService.getClientCount();
    const data = {
      isConnected: clientCount > 0,
      clientCount: clientCount,
      lastUpdate: new Date().toISOString(),
    };
    res.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
}; 