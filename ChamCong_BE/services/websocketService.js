const WebSocket = require('ws');
const EventEmitter = require('events');
const fingerprintController = require('../controllers/fingerprintController');

class WebSocketService extends EventEmitter {
    constructor() {
        super();
        this.wss = null;
        this.clients = new Map(); // Map<deviceId, { ws, lastHeartbeatTime, isAlive }>
        this.pendingEnrollment = new Map();
        this.pendingDeletion = new Map();
        this.enrollmentProgress = new Map(); // Thêm Map để lưu trữ thông tin tiến trình đăng ký
        this.heartbeatInterval = 10000; // Gửi heartbeat mỗi 10 giây
        this.heartbeatTimeout = 20000; // Timeout 15 giây nếu không nhận được phản hồi
    }

    initializeWebSocketServer(server) {
        if (this.wss) return this.wss;

        this.wss = new WebSocket.Server({ server });
        console.log("WebSocket Server initialized.");

        this.wss.on('connection', (ws, req) => {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const deviceId = urlParams.get('deviceId') || `esp-${Date.now()}`;
            console.log(`New client connected: ${deviceId}`);

            // Khởi tạo metadata cho client
            this.clients.set(deviceId, {
                ws,
                lastHeartbeatTime: Date.now(),
                isAlive: true
            });
            ws.deviceId = deviceId;

            // Xử lý tin nhắn nhận được
            ws.on('message', async (message) => {
                let data;
                try {
                    const messageString = message instanceof Buffer ? message.toString() : message;
                    data = JSON.parse(messageString);

                    switch (data.type) {
                        case 'scan_result':
                            await fingerprintController.handleScanResult(deviceId, data.payload);
                            break;
                        case 'enroll_status':
                            this.handleEnrollmentResponse(data.payload);
                            break;
                        case 'delete_status':
                            this.handleDeletionResponse(data.payload);
                            break;
                        case 'heartbeat':
                            // Cập nhật trạng thái heartbeat
                            const client = this.clients.get(deviceId);
                            if (client) {
                                client.lastHeartbeatTime = Date.now();
                                client.isAlive = true;
                            }
                            break;
                        default:
                            console.log(`Unknown WS message type from ${deviceId}: ${data.type}`);
                    }
                } catch (error) {
                    console.error(`Error processing WS message from ${deviceId}:`, error);
                }
            });

            ws.on('close', (code, reason) => {
                console.log(`Client ${deviceId} disconnected: Code=${code}, Reason=${reason || 'none'}`);
                this.clients.delete(deviceId);
                this.cleanupPendingRequests(deviceId);
                this.emit('statusChange');
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error from ${deviceId}:`, error.message);
                this.clients.delete(deviceId);
                this.cleanupPendingRequests(deviceId);
                this.emit('statusChange');
            });

            this.emit('statusChange');
        });

        this.wss.on('error', (error) => {
            console.error("WebSocket Server error:", error);
        });

        // Bắt đầu cơ chế heartbeat
        this.startHeartbeat();

        return this.wss;
    }

    startHeartbeat() {
        setInterval(() => {
            const now = Date.now();
            this.clients.forEach((client, deviceId) => {
                // Kiểm tra nếu thiết bị đang trong quá trình đăng ký vân tay thì bỏ qua kiểm tra heartbeat
                const isDeviceEnrolling = this.isDeviceEnrolling(deviceId);
                if (isDeviceEnrolling) {
                    console.log(`Skip heartbeat check for ${deviceId} - currently enrolling`);
                    return;
                }
                
                // Kiểm tra nếu client không phản hồi trong thời gian timeout
                if (!client.isAlive || now - client.lastHeartbeatTime > this.heartbeatTimeout) {
                    console.log(`Client ${deviceId} is unresponsive (last heartbeat: ${new Date(client.lastHeartbeatTime).toISOString()}). Terminating connection.`);
                    client.ws.terminate();
                    this.clients.delete(deviceId);
                    this.cleanupPendingRequests(deviceId);
                    this.emit('statusChange');
                    return;
                }
                client.isAlive = false; // Mong đợi phản hồi heartbeat
                try {
                    const heartbeatMsg = JSON.stringify({ type: 'heartbeat' });
                    client.ws.send(heartbeatMsg);
                } catch (error) {
                    console.error(`Error sending heartbeat to ${deviceId}:`, error);
                    client.ws.terminate();
                    this.clients.delete(deviceId);
                    this.cleanupPendingRequests(deviceId);
                    this.emit('statusChange');
                }
            });
        }, this.heartbeatInterval);
    }

    // Hàm kiểm tra xem thiết bị có đang trong quá trình đăng ký vân tay không
    isDeviceEnrolling(deviceId) {
        let isEnrolling = false;
        this.pendingEnrollment.forEach((req, id) => {
            if (req.deviceId === deviceId) {
                isEnrolling = true;
            }
        });
        return isEnrolling;
    }

    getWss() {
        return this.wss;
    }

    getClientCount() {
        return this.clients.size;
    }

    sendCommandToDevice(deviceId, command) {
        const client = this.clients.get(deviceId);
        if (client && client.isAlive) {
            try {
                console.log(`Sending command to ${deviceId}:`, command);
                client.ws.send(JSON.stringify(command));
                return true;
            } catch (error) {
                console.error(`Error sending command to ${deviceId}:`, error);
                this.clients.delete(deviceId);
                this.cleanupPendingRequests(deviceId);
                this.emit('statusChange');
                return false;
            }
        } else {
            console.warn(`Device ${deviceId} not found or not alive.`);
            return false;
        }
    }

    checkClient(deviceId) {
        const client = this.clients.get(deviceId);
        if (client) {
            console.log(`Client ${deviceId}: isAlive = ${client.isAlive}, lastHeartbeatTime = ${new Date(client.lastHeartbeatTime).toISOString()}`);
            return client.isAlive;
        } else {
            console.log(`Client ${deviceId} not found.`);
            return false;
        }
    }

    requestEnrollmentOnDevice(deviceId, templateId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const command = { type: "enroll", id: templateId };
            if (this.sendCommandToDevice(deviceId, command)) {
                const timeoutId = setTimeout(() => {
                    this.pendingEnrollment.delete(templateId);
                    reject(new Error(`Enrollment request for ID ${templateId} on ${deviceId} timed out.`));
                }, timeout);
                this.pendingEnrollment.set(templateId, { resolve, reject, timeoutId, deviceId });
                console.log(`Enrollment request initiated for ID ${templateId} on ${deviceId}. Waiting for response...`);
            } else {
                reject(new Error(`Failed to send enroll command to device ${deviceId}.`));
            }
        });
    }

    handleEnrollmentResponse(payload) {
        const { id, status, message, step } = payload;
        const pending = this.pendingEnrollment.get(id);

        if (pending) {
            clearTimeout(pending.timeoutId);
            console.log(`Handling enrollment response for ID ${id}: ${status}`);

            // Cập nhật thông tin tiến trình
            const progress = this.enrollmentProgress.get(id);
            if (progress) {
                progress.status = status;
                progress.step = step || progress.step;
                progress.message = message || progress.message;
                this.enrollmentProgress.set(id, progress);
                
                // Phát sự kiện có cập nhật tiến trình
                console.log(`Emitting enrollmentProgress event for ID ${id}: ${progress.status}, step ${progress.step}`);
                console.log(`Event data:`, JSON.stringify(progress));
                this.emit('enrollmentProgress', id, progress);
            }

            if (status === 'success') {
                pending.resolve({ status, id });
                this.pendingEnrollment.delete(id);
            } else if (status === 'error') {
                pending.reject(new Error(message || `Enrollment failed on device for ID ${id}.`));
                this.pendingEnrollment.delete(id);
            } else if (status === 'processing') {
                console.log(`Enrollment progress for ID ${id}: Step ${step} - ${message}`);
                const timeoutId = setTimeout(() => {
                    this.pendingEnrollment.delete(id);
                    pending.reject(new Error(`Enrollment request for ID ${id} on ${pending.deviceId} timed out during processing.`));
                }, 30000);
                this.pendingEnrollment.set(id, { ...pending, timeoutId });
            }
        } else {
            console.warn(`Received enrollment response for unknown/completed ID: ${id}`);
        }
    }

    getEnrollmentProgress(id) {
        return this.enrollmentProgress.get(id);
    }

    setEnrollmentProgress(id, progress) {
        this.enrollmentProgress.set(id, progress);
        // Phát sự kiện khi cập nhật tiến trình
        console.log(`Emitting enrollmentProgress event for ID ${id}: ${progress.status}, step ${progress.step}`);
        this.emit('enrollmentProgress', id, progress);
    }

    requestDeletionOnDevice(deviceId, templateId, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const command = { type: "delete", id: templateId };
            if (this.sendCommandToDevice(deviceId, command)) {
                const timeoutId = setTimeout(() => {
                    this.pendingDeletion.delete(templateId);
                    reject(new Error(`Deletion request for ID ${templateId} on ${deviceId} timed out.`));
                }, timeout);
                this.pendingDeletion.set(templateId, { resolve, reject, timeoutId, deviceId });
                console.log(`Deletion request initiated for ID ${templateId} on ${deviceId}. Waiting for response...`);
            } else {
                reject(new Error(`Failed to send delete command to device ${deviceId}.`));
            }
        });
    }

    handleDeletionResponse(payload) {
        const { id, status, message } = payload;
        const pending = this.pendingDeletion.get(id);

        if (pending) {
            clearTimeout(pending.timeoutId);
            this.pendingDeletion.delete(id);
            console.log(`Handling deletion response for ID ${id}: ${status}`);
            if (status === 'success') {
                pending.resolve({ status, id });
            } else {
                pending.reject(new Error(message || `Deletion failed on device for ID ${id}.`));
            }
        } else {
            console.warn(`Received deletion response for unknown/completed ID: ${id}`);
        }
    }

    cleanupPendingRequests(deviceId) {
        this.pendingEnrollment.forEach((req, id) => {
            if (req.deviceId === deviceId) {
                clearTimeout(req.timeoutId);
                req.reject(new Error(`Device ${deviceId} disconnected during enrollment for ID ${id}.`));
                this.pendingEnrollment.delete(id);
            }
        });
        this.pendingDeletion.forEach((req, id) => {
            if (req.deviceId === deviceId) {
                clearTimeout(req.timeoutId);
                req.reject(new Error(`Device ${deviceId} disconnected during deletion for ID ${id}.`));
                this.pendingDeletion.delete(id);
            }
        });
    }
}

module.exports = new WebSocketService();