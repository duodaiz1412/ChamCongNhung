// routes/apiRoutes.js
const express = require('express');
const statusController = require('../controllers/statusController');
const logController = require('../controllers/logController');
const userController = require('../controllers/userController');

const router = express.Router();

// Device Status SSE
router.get('/device-status', statusController.getDeviceStatusSSE);

// Attendance Logs
router.get('/logs', logController.getLogs);
router.get('/export-excel', logController.downloadExcel);

// User Management
router.get('/users', userController.getUsers);
router.post('/users', userController.addUser); // API thêm user cơ bản
router.put('/users/:userId', userController.updateUser); // Cập nhật user theo userId
router.delete('/users/:userId', userController.initiateDeleteUser); // Xóa user và vân tay

// Fingerprint Enrollment
router.post('/enroll/request', userController.requestEnrollment); // Yêu cầu bắt đầu đăng ký

module.exports = router;