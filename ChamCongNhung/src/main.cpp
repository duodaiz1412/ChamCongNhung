#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_Fingerprint.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// --- WiFi Credentials ---
const char *ssid = "PTIT_WIFI"; // Thay bằng tên WiFi của bạn
const char *password = ""; // Thay bằng mật khẩu WiFi
const char *WS_HOST = "172.11.73.90"; // Thay bằng IP của máy chủ
// const char *ssid = "217 Tran Phu"; // Thay bằng tên WiFi của bạn
// const char *password = "chothuephong"; // Thay bằng mật khẩu WiFi
// const char *WS_HOST = "192.168.1.215"; // Thay bằng IP của máy chủ

// --- Backend WebSocket Server ---
const uint16_t WS_PORT = 3000;       // Port của máy chủ

// --- Device ID ---
const char *DEVICE_ID = "ESP_CHAMCONG_01"; // ID duy nhất cho thiết bị

// --- Hardware Pins ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define BUZZER_PIN D7
#define FINGERPRINT_RX D5
#define FINGERPRINT_TX D6

// --- Objects ---
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
SoftwareSerial mySerial(FINGERPRINT_RX, FINGERPRINT_TX);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);
WebSocketsClient webSocket;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 25200, 60000); // GMT+7

// --- Variables ---
bool isWebSocketConnected = false;
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000; // Thử kết nối lại sau 5 giây
unsigned long lastHeartbeatSent = 0;
const unsigned long heartbeatInterval = 10000; // Gửi heartbeat mỗi 10 giây

// Thêm biến toàn cục để theo dõi trạng thái đăng ký
bool isEnrolling = false;

// --- Function Declarations ---
void displayStatus(String line1, String line2 = "");
void connectWiFi();
void connectWebSocket();
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length);
void sendWebSocketMessage(const char *type, const JsonDocument &payload);
void sendHeartbeat();
void handleEnrollCommand(int id);
void handleDeleteCommand(int id);
int getFingerprintID();
void processFingerprintScan();

// --- Function Implementations ---
void displayStatus(String line1, String line2) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println(line1);
    if (line2 != "") {
        display.setCursor(0, 10);
        display.println(line2);
    }
    display.display();
}

void connectWiFi() {
    displayStatus("Connecting WiFi");
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi.");
    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 30000) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\nFailed to connect to WiFi.");
        displayStatus("WiFi Failed!");
        delay(5000);
        ESP.restart();
    } else {
        Serial.println("\nConnected to WiFi");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("RSSI: ");
        Serial.println(WiFi.RSSI()); // Log tín hiệu WiFi
        displayStatus("WiFi Connected", WiFi.localIP().toString());
        delay(1000);
    }
}

void connectWebSocket() {
    lastReconnectAttempt = millis();
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected. Cannot connect WebSocket.");
        displayStatus("No WiFi for WS");
        return;
    }
    String wsUrl = String("/") + "?deviceId=" + String(DEVICE_ID);
    webSocket.begin(WS_HOST, WS_PORT, wsUrl.c_str());
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
    Serial.println("Attempting WebSocket connection...");
    displayStatus("Connecting WS...");
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
    case WStype_DISCONNECTED:
        isWebSocketConnected = false;
        Serial.println("[WebSocket] Disconnected!");
        displayStatus("WS Disconnected");
        break;
    case WStype_CONNECTED:
        isWebSocketConnected = true;
        Serial.print("[WebSocket] Connected to url: ");
        Serial.println((char *)payload);
        displayStatus("WS Connected", "Server OK");
        delay(2000); // Chờ 2 giây
        displayStatus("Moi dat van tay"); // Chuyển sang trạng thái Ready
        lastHeartbeatSent = millis(); // Khởi tạo thời gian heartbeat
        break;
    case WStype_TEXT:
        {
            isWebSocketConnected = true;
            Serial.printf("[WebSocket] Received: %s\n", payload);

            StaticJsonDocument<200> doc;
            DeserializationError error = deserializeJson(doc, payload, length);

            if (error) {
                Serial.print(F("deserializeJson() failed: "));
                Serial.println(error.f_str());
                StaticJsonDocument<100> errPayload;
                errPayload["message"] = "Invalid JSON received";
                errPayload["original"] = (const char*)payload;
                sendWebSocketMessage("error_report", errPayload);
                return;
            }

            const char *messageType = doc["type"];
            if (!messageType) {
                Serial.println("Received JSON without 'type' field.");
                return;
            }

            if (strcmp(messageType, "heartbeat") == 0) {
                Serial.println("[WebSocket] Received heartbeat from server");
                StaticJsonDocument<50> heartbeatPayload;
                heartbeatPayload["status"] = "alive";
                sendWebSocketMessage("heartbeat", heartbeatPayload);
            } else if (strcmp(messageType, "enroll") == 0) {
                if (doc.containsKey("id") && doc["id"].is<int>()) {
                    int idToEnroll = doc["id"];
                    if (idToEnroll > 0) {
                        handleEnrollCommand(idToEnroll);
                    } else {
                        Serial.println("Invalid ID (< 1) received for enroll command.");
                        StaticJsonDocument<100> errPayload;
                        errPayload["id"] = idToEnroll;
                        errPayload["status"] = "error";
                        errPayload["message"] = "Invalid ID (< 1) for enroll";
                        sendWebSocketMessage("enroll_status", errPayload);
                    }
                } else {
                    Serial.println("Missing or invalid 'id' field for enroll command.");
                    StaticJsonDocument<100> errPayload;
                    errPayload["status"] = "error";
                    errPayload["message"] = "Missing/invalid 'id' for enroll";
                    sendWebSocketMessage("enroll_status", errPayload);
                }
            } else if (strcmp(messageType, "delete") == 0) {
                if (doc.containsKey("id") && doc["id"].is<int>()) {
                    int idToDelete = doc["id"];
                    if (idToDelete > 0) {
                        handleDeleteCommand(idToDelete);
                    } else {
                        Serial.println("Invalid ID (< 1) received for delete command.");
                        StaticJsonDocument<100> errPayload;
                        errPayload["id"] = idToDelete;
                        errPayload["status"] = "error";
                        errPayload["message"] = "Invalid ID (< 1) for delete";
                        sendWebSocketMessage("delete_status", errPayload);
                    }
                } else {
                    Serial.println("Missing or invalid 'id' field for delete command.");
                    StaticJsonDocument<100> errPayload;
                    errPayload["status"] = "error";
                    errPayload["message"] = "Missing/invalid 'id' for delete";
                    sendWebSocketMessage("delete_status", errPayload);
                }
            } else {
                Serial.print("Unknown command type received: ");
                Serial.println(messageType);
            }
            break;
        }
    case WStype_PING:
        Serial.println("[WebSocket] Received ping");
        break;
    case WStype_PONG:
        Serial.println("[WebSocket] Received pong");
        break;
    case WStype_ERROR:
        Serial.printf("[WebSocket] Error: %s\n", payload);
        break;
    default:
        break;
    }
}

void sendWebSocketMessage(const char *type, const JsonDocument &payloadDoc) {
    if (!isWebSocketConnected) {
        Serial.println("WebSocket not connected, cannot send message.");
        return;
    }

    StaticJsonDocument<256> messageDoc;
    messageDoc["type"] = type;
    messageDoc["payload"] = payloadDoc;

    String output;
    serializeJson(messageDoc, output);

    Serial.print("Sending WS message: ");
    Serial.println(output);
    if (!webSocket.sendTXT(output)) {
        Serial.println("WebSocket sendTXT failed!");
    }
}

void sendHeartbeat() {
    StaticJsonDocument<50> heartbeatPayload;
    heartbeatPayload["status"] = "alive";
    sendWebSocketMessage("heartbeat", heartbeatPayload);
}

void handleEnrollCommand(int id) {
    isEnrolling = true; // Đánh dấu bắt đầu đăng ký
    Serial.printf("Starting enrollment process for ID: %d\n", id);
    StaticJsonDocument<150> statusPayload;
    statusPayload["id"] = id;

    statusPayload["status"] = "ready";
    statusPayload["step"] = 0;
    statusPayload["message"] = "Ready to enroll";
    sendWebSocketMessage("enroll_status", statusPayload);

    displayStatus("Enroll ID: " + String(id), "Place finger");
    statusPayload["status"] = "processing";
    statusPayload["step"] = 1;
    statusPayload["message"] = "Place finger (1st time)";
    sendWebSocketMessage("enroll_status", statusPayload);

    int p = -1;
    unsigned long stepStartTime = millis();
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        if (millis() - stepStartTime > 15000) {
            displayStatus("Timeout", "Enroll Cancelled");
            statusPayload["status"] = "error";
            statusPayload["message"] = "Timeout waiting for finger (1st)";
            sendWebSocketMessage("enroll_status", statusPayload);
            delay(2000);
            displayStatus("Moi dat van tay");
            return;
        }
        webSocket.loop();
        delay(50);
    }
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
        displayStatus("Enroll Failed", "Image error");
        statusPayload["status"] = "error";
        statusPayload["message"] = "Failed to process 1st image";
        sendWebSocketMessage("enroll_status", statusPayload);
        delay(2000);
        displayStatus("Moi dat van tay");
        return;
    }

    // Kiểm tra xem vân tay đã tồn tại hay chưa
    p = finger.fingerFastSearch();
    if (p == FINGERPRINT_OK) {
        displayStatus("Enroll Failed", "Van tay da dang ky");
        statusPayload["status"] = "error";
        statusPayload["message"] = "Fingerprint already registered with ID: " + String(finger.fingerID);
        sendWebSocketMessage("enroll_status", statusPayload);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(100);
        digitalWrite(BUZZER_PIN, LOW);
        delay(100);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(100);
        digitalWrite(BUZZER_PIN, LOW);
        delay(2000);
        displayStatus("Moi dat van tay");
        return;
    }

    displayStatus("Enroll ID: " + String(id), "Remove finger");
    statusPayload["step"] = 2;
    statusPayload["message"] = "Remove finger";
    sendWebSocketMessage("enroll_status", statusPayload);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(1000);

    p = 0;
    stepStartTime = millis();
    while (p != FINGERPRINT_NOFINGER) {
        p = finger.getImage();
        if (millis() - stepStartTime > 5000) {
            displayStatus("Timeout", "Enroll Cancelled");
            statusPayload["status"] = "error";
            statusPayload["message"] = "Timeout waiting for finger removal";
            sendWebSocketMessage("enroll_status", statusPayload);
            delay(2000);
            displayStatus("Moi dat van tay");
            return;
        }
        webSocket.loop();
        delay(50);
    }
    Serial.println("Finger removed.");

    displayStatus("Enroll ID: " + String(id), "Place again");
    statusPayload["step"] = 3;
    statusPayload["message"] = "Place finger again (2nd time)";
    sendWebSocketMessage("enroll_status", statusPayload);

    p = -1;
    stepStartTime = millis();
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        if (millis() - stepStartTime > 15000) {
            displayStatus("Timeout", "Enroll Cancelled");
            statusPayload["status"] = "error";
            statusPayload["message"] = "Timeout waiting for finger (2nd)";
            sendWebSocketMessage("enroll_status", statusPayload);
            delay(2000);
            displayStatus("Moi dat van tay");
            return;
        }
        webSocket.loop();
        delay(50);
    }
    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
        displayStatus("Enroll Failed", "Image error 2");
        statusPayload["status"] = "error";
        statusPayload["message"] = "Failed to process 2nd image";
        sendWebSocketMessage("enroll_status", statusPayload);
        delay(2000);
        displayStatus("Moi dat van tay");
        return;
    }

    displayStatus("Processing...");
    Serial.println("Creating model...");
    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
        displayStatus("Enroll Failed", "Model creation err");
        statusPayload["status"] = "error";
        if (p == FINGERPRINT_PACKETRECIEVEERR) statusPayload["message"] = "Comm error creating model";
        else if (p == FINGERPRINT_ENROLLMISMATCH) statusPayload["message"] = "Fingerprints did not match";
        else statusPayload["message"] = "Error creating model";
        sendWebSocketMessage("enroll_status", statusPayload);
        delay(2000);
        displayStatus("Moi dat van tay");
        return;
    }

    Serial.println("Model created.");
    Serial.print("Storing model #");
    Serial.println(id);
    p = finger.storeModel(id);
    if (p == FINGERPRINT_OK) {
        displayStatus("Enroll Success!", "ID: " + String(id));
        digitalWrite(BUZZER_PIN, HIGH);
        delay(500);
        digitalWrite(BUZZER_PIN, LOW);
        statusPayload["status"] = "success";
        statusPayload["message"] = "Enrollment successful";
        sendWebSocketMessage("enroll_status", statusPayload);
        delay(2000);
    } else {
        displayStatus("Enroll Failed", "Store error");
        statusPayload["status"] = "error";
        if (p == FINGERPRINT_PACKETRECIEVEERR) statusPayload["message"] = "Comm error storing model";
        else if (p == FINGERPRINT_BADLOCATION) statusPayload["message"] = "Invalid storage location";
        else if (p == FINGERPRINT_FLASHERR) statusPayload["message"] = "Flash storage error";
        else statusPayload["message"] = "Error storing model";
        sendWebSocketMessage("enroll_status", statusPayload);
        delay(2000);
    }
    isEnrolling = false; // Đánh dấu kết thúc đăng ký
    displayStatus("Moi dat van tay");
}

void handleDeleteCommand(int id) {
    Serial.printf("Deleting fingerprint template ID: %d\n", id);
    displayStatus("Deleting ID: " + String(id));
    StaticJsonDocument<100> statusPayload;
    statusPayload["id"] = id;

    uint8_t p = finger.deleteModel(id);

    if (p == FINGERPRINT_OK) {
        Serial.println("Template deleted");
        displayStatus("Delete Success!", "ID: " + String(id));
        digitalWrite(BUZZER_PIN, HIGH);
        delay(100);
        digitalWrite(BUZZER_PIN, LOW);
        statusPayload["status"] = "success";
        statusPayload["message"] = "Deletion successful";
    } else {
        Serial.print("Error deleting template: ");
        displayStatus("Delete Failed", "ID: " + String(id));
        statusPayload["status"] = "error";
        if (p == FINGERPRINT_PACKETRECIEVEERR) {
            Serial.println("Comm error");
            statusPayload["message"] = "Communication error";
        } else if (p == FINGERPRINT_DELETEFAIL) {
            Serial.println("Could not delete");
            statusPayload["message"] = "Failed to delete from sensor";
        } else {
            Serial.println("Unknown error");
            statusPayload["message"] = "Unknown sensor error during delete";
        }
    }
    sendWebSocketMessage("delete_status", statusPayload);
    delay(2000);
    displayStatus("Moi dat van tay");
}

int getFingerprintID() {
    uint8_t p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) return 0;
    if (p != FINGERPRINT_OK) {
        Serial.println("Error getting image");
        return -1;
    }

    p = finger.image2Tz();
    if (p != FINGERPRINT_OK) {
        Serial.println("Error converting image");
        return -1;
    }

    p = finger.fingerFastSearch();
    if (p != FINGERPRINT_OK) return -2;

    return finger.fingerID;
}

void processFingerprintScan() {
    int fingerId = getFingerprintID();
    if (fingerId == 0) return;

    if (fingerId > 0) {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(100);
        digitalWrite(BUZZER_PIN, LOW);

        StaticJsonDocument<150> payload;
        payload["id"] = fingerId;

        // Validate and format NTP time
        timeClient.update(); // Force an NTP update
        if (timeClient.isTimeSet() && timeClient.getEpochTime() > 946684800) { // Post-2000 epoch
            time_t epoch = timeClient.getEpochTime();
            char isoTime[25];
            strftime(isoTime, sizeof(isoTime), "%Y-%m-%dT%H:%M:%SZ", gmtime(&epoch));
            payload["timestamp"] = isoTime;
            Serial.print("Sending timestamp: ");
            Serial.println(isoTime);
        } else {
            Serial.println("NTP time not valid, sending scan without timestamp.");
        }

        sendWebSocketMessage("scan_result", payload);
        displayStatus("ID: " + String(fingerId), "Sent to server");
        delay(2000);
        displayStatus("Moi dat van tay");
    } else if (fingerId == -2) {
        displayStatus("Unknown Finger");
        digitalWrite(BUZZER_PIN, HIGH);
        delay(50);
        digitalWrite(BUZZER_PIN, LOW);
        delay(50);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(50);
        digitalWrite(BUZZER_PIN, LOW);
        delay(1500);
        displayStatus("Moi dat van tay");
    } else if (fingerId == -1) {
        displayStatus("Sensor Error", "Please try again");
        delay(1500);
        displayStatus("Moi dat van tay");
    }
}

void setup() {
    Serial.begin(115200);
    mySerial.begin(57600);

    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println(F("SSD1306 failed"));
        for (;;);
    }
    display.clearDisplay();
    display.setTextColor(WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Initializing...");
    display.display();

    finger.begin(57600);
    delay(50);
    if (finger.verifyPassword()) {
        Serial.println("Found fingerprint sensor!");
    } else {
        Serial.println("Sensor not found!");
        displayStatus("Sensor Error!");
        while (1) {
            delay(1);
        }
    }
    finger.getTemplateCount();
    Serial.print("Sensor templates: ");
    Serial.println(finger.templateCount);

    connectWiFi();
    timeClient.begin();
    connectWebSocket();
    displayStatus("Moi dat van tay");
}

void loop() {
    webSocket.loop();

    // Gửi heartbeat định kỳ (chỉ khi không trong quá trình đăng ký)
    if (isWebSocketConnected && !isEnrolling && millis() - lastHeartbeatSent > heartbeatInterval) {
        sendHeartbeat();
        lastHeartbeatSent = millis();
        Serial.println("Sent heartbeat to server");
    }

    // Cập nhật thời gian NTP
    static unsigned long lastNTPUpdate = 0;
    if (millis() - lastNTPUpdate > 300000 && WiFi.status() == WL_CONNECTED) {
        timeClient.update();
        lastNTPUpdate = millis();
        Serial.println("NTP Time Updated: " + timeClient.getFormattedTime());
    }

    // Kiểm tra heap memory
    static unsigned long lastHeapCheck = 0;
    if (millis() - lastHeapCheck > 60000) {
        Serial.print("Free Heap: ");
        Serial.println(ESP.getFreeHeap());
        lastHeapCheck = millis();
    }

    // Thử kết nối lại nếu mất kết nối (nhưng chỉ khi không đang đăng ký)
    if (!isWebSocketConnected && !isEnrolling && millis() - lastReconnectAttempt > reconnectInterval) {
        connectWebSocket();
    }

    // Cảnh báo nếu mất kết nối (nhưng chỉ khi không đang đăng ký)
    if (!isWebSocketConnected && !isEnrolling) {
        static unsigned long lastWarningTime = 0;
        if (millis() - lastWarningTime > 10000) {
            displayStatus("WS Disconnected", "Trying to connect");
            lastWarningTime = millis();
        }
    }

    // Xử lý quét vân tay (chỉ khi đã kết nối và không đang đăng ký)
    if (isWebSocketConnected && !isEnrolling) {
        processFingerprintScan();
    }

    delay(50);
}


// ** CODE TO CLEAR FINGERPRINT DATABASE **
// #include <Adafruit_Fingerprint.h>
// #include <Adafruit_GFX.h>
// #include <Adafruit_SSD1306.h>

// // --- Hardware Pins ---
// #define SCREEN_WIDTH 128
// #define SCREEN_HEIGHT 32
// #define BUZZER_PIN D7
// #define FINGERPRINT_RX D5
// #define FINGERPRINT_TX D6

// // --- Objects ---
// Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
// SoftwareSerial mySerial(FINGERPRINT_RX, FINGERPRINT_TX);
// Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// // --- Function to Display Status ---
// void displayStatus(String line1, String line2 = "") {
//     display.clearDisplay();
//     display.setCursor(0, 0);
//     display.println(line1);
//     if (line2 != "") {
//         display.setCursor(0, 10);
//         display.println(line2);
//     }
//     display.display();
// }

// void setup() {
//     Serial.begin(115200);
//     mySerial.begin(57600);

//     // Initialize Buzzer
//     pinMode(BUZZER_PIN, OUTPUT);
//     digitalWrite(BUZZER_PIN, LOW);

//     // Initialize OLED Display
//     if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
//         Serial.println(F("SSD1306 initialization failed"));
//         for (;;); // Halt if display fails
//     }
//     display.clearDisplay();
//     display.setTextColor(WHITE);
//     display.setTextSize(1);
//     display.setCursor(0, 0);
//     display.println("Initializing...");
//     display.display();

//     // Initialize Fingerprint Sensor
//     finger.begin(57600);
//     delay(50);
//     if (finger.verifyPassword()) {
//         Serial.println("Found fingerprint sensor!");
//         displayStatus("Sensor Found");
//     } else {
//         Serial.println("Fingerprint sensor not found!");
//         displayStatus("Sensor Error!");
//         while (1) { // Halt if sensor not found
//             digitalWrite(BUZZER_PIN, HIGH);
//             delay(100);
//             digitalWrite(BUZZER_PIN, LOW);
//             delay(100);
//         }
//     }

//     // Get initial template count
//     finger.getTemplateCount();
//     Serial.print("Initial templates in sensor: ");
//     Serial.println(finger.templateCount);
//     displayStatus("Templates: " + String(finger.templateCount));

//     // Clear all fingerprints
//     Serial.println("Clearing all fingerprint templates...");
//     displayStatus("Clearing Database...");
//     uint8_t p = finger.emptyDatabase();

//     if (p == FINGERPRINT_OK) {
//         Serial.println("All fingerprint templates cleared successfully");
//         displayStatus("Database Cleared!", "Success");
//         digitalWrite(BUZZER_PIN, HIGH);
//         delay(500);
//         digitalWrite(BUZZER_PIN, LOW);
//         delay(1000);
//     } else {
//         Serial.println("Error clearing database");
//         displayStatus("Clear Failed", "Sensor Error");
//         if (p == FINGERPRINT_PACKETRECIEVEERR) {
//             Serial.println("Communication error");
//             displayStatus("Clear Failed", "Comm Error");
//         } else {
//             Serial.println("Unknown error");
//             displayStatus("Clear Failed", "Unknown Error");
//         }
//         digitalWrite(BUZZER_PIN, HIGH);
//         delay(100);
//         digitalWrite(BUZZER_PIN, LOW);
//         delay(100);
//         digitalWrite(BUZZER_PIN, HIGH);
//         delay(100);
//         digitalWrite(BUZZER_PIN, LOW);
//     }

//     // Verify template count after clearing
//     finger.getTemplateCount();
//     Serial.print("Templates after clear: ");
//     Serial.println(finger.templateCount);
//     displayStatus("Templates: " + String(finger.templateCount), "Done!");

//     // Indicate completion
//     Serial.println("Clear operation complete. You can now re-upload your original code.");
//     displayStatus("Operation Done", "Re-upload Code");
// }

// void loop() {
//     // Do nothing, program halts after clearing
//     delay(1000);
// }

// ** Code to see Maximum fingerprint capacity of fingerprint database **

// #include <Adafruit_Fingerprint.h>
// #include <Adafruit_GFX.h>
// #include <Adafruit_SSD1306.h>

// // --- Hardware Pins ---
// #define SCREEN_WIDTH 128
// #define SCREEN_HEIGHT 32
// #define BUZZER_PIN D7
// #define FINGERPRINT_RX D5
// #define FINGERPRINT_TX D6

// // --- Objects ---
// Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
// SoftwareSerial mySerial(FINGERPRINT_RX, FINGERPRINT_TX);
// Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// // --- Function to Display Status ---
// void displayStatus(String line1, String line2 = "") {
//     display.clearDisplay();
//     display.setCursor(0, 0);
//     display.println(line1);
//     if (line2 != "") {
//         display.setCursor(0, 10);
//         display.println(line2);
//     }
//     display.display();
// }

// void setup() {
//     Serial.begin(115200);
//     mySerial.begin(57600);

//     // Initialize Buzzer
//     pinMode(BUZZER_PIN, OUTPUT);
//     digitalWrite(BUZZER_PIN, LOW);

//     // Initialize OLED Display
//     if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
//         Serial.println(F("SSD1306 initialization failed"));
//         for (;;); // Halt if display fails
//     }
//     display.clearDisplay();
//     display.setTextColor(WHITE);
//     display.setTextSize(1);
//     display.setCursor(0, 0);
//     display.println("Initializing...");
//     display.display();

//     // Initialize Fingerprint Sensor
//     finger.begin(57600);
//     delay(50);
//     if (finger.verifyPassword()) {
//         Serial.println("Found fingerprint sensor!");
//         displayStatus("Sensor Found");
//     } else {
//         Serial.println("Fingerprint sensor not found!");
//         displayStatus("Sensor Error!");
//         while (1) {
//             digitalWrite(BUZZER_PIN, HIGH);
//             delay(100);
//             digitalWrite(BUZZER_PIN, LOW);
//             delay(100);
//         }
//     }

//     // Get sensor parameters to check capacity
//     Serial.println("Reading sensor parameters...");
//     displayStatus("Checking Capacity...");
//     uint8_t p = finger.getParameters();
//     if (p == FINGERPRINT_OK) {
//         // Get the maximum template capacity
//         uint16_t maxTemplates = finger.capacity; // Capacity is provided by the library
//         Serial.print("Maximum fingerprint capacity: ");
//         Serial.print(maxTemplates);
//         Serial.println(" templates");
//         displayStatus("Max Capacity:", String(maxTemplates) + " templates");

//         // Get current template count for reference
//         finger.getTemplateCount();
//         Serial.print("Current templates stored: ");
//         Serial.print(finger.templateCount);
//         Serial.println(" templates");
//         displayStatus("Max: " + String(maxTemplates), "Used: " + String(finger.templateCount));
//     } else {
//         Serial.println("Failed to read sensor parameters");
//         displayStatus("Param Error");
//         if (p == FINGERPRINT_PACKETRECIEVEERR) {
//             Serial.println("Communication error");
//             displayStatus("Comm Error");
//         } else {
//             Serial.println("Unknown error");
//             displayStatus("Unknown Error");
//         }
//         digitalWrite(BUZZER_PIN, HIGH);
//         delay(100);
//         digitalWrite(BUZZER_PIN, LOW);
//         delay(100);
//         digitalWrite(BUZZER_PIN, HIGH);
//         delay(100);
//         digitalWrite(BUZZER_PIN, LOW);
//     }

//     // Indicate completion
//     Serial.println("Capacity check complete.");
//     displayStatus("Check Complete", "See Serial");
// }

// void loop() {
//     // Do nothing, program halts after checking
//     delay(1000);
// }