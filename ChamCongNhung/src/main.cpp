#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ESP8266HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_Fingerprint.h>

const char *ssid = "Xom Tro Vui Ve";
const char *password = "maiduy0507";
const char *googleScriptURL = "https://script.google.com/macros/s/AKfycbz-Blo_AXMJUbi5KJ-ei2G0Xv1wFfckK-zp2iLgd6Q_jujLE_h3WGQ_nxBOYgKWDuatxg/exec";
const char *WS_HOST = "192.168.1.6";
const uint16_t WS_PORT = 3000;
const char *WS_PATH = "/";

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define BUZZER_PIN D7

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
SoftwareSerial mySerial(D5, D6);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);
WebSocketsClient webSocket;

int getFingerprintID()
{
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) return 0;
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) return -1;

  return finger.fingerID;
}

void displayStatus(String message)
{
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println(message);
  display.display();
}

void sendToGoogleSheets(int id)
{
  if (WiFi.status() == WL_CONNECTED)
  {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    String jsonData = "{\"fingerID\":" + String(id) + "}";
    Serial.println("Sending data to Google Sheets: " + jsonData);
    http.begin(client, googleScriptURL);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(jsonData);
    Serial.println("HTTP Response Code: " + String(httpCode));
    if (httpCode > 0)
    {
      String response = http.getString();
    }
    http.end();
  }
}

void sendFingerprintData()
{
  finger.getTemplateCount();
  uint16_t templateCount = finger.templateCount;
  String jsonData = "{\"type\":\"fingerprint_data\",\"count\":" + String(templateCount) + ",\"ids\":[";

  bool first = true;
  for (int id = 1; id <= 127; id++)
  {
    if (finger.loadModel(id) == FINGERPRINT_OK && finger.fingerFastSearch() == FINGERPRINT_OK)
    {
      if (!first) jsonData += ",";
      jsonData += String(id);
      first = false;
    }
  }
  jsonData += "]}";
  
  webSocket.sendTXT(jsonData);
}

void deleteFingerprint(int id)
{
  uint8_t p = finger.deleteModel(id);
  if (p == FINGERPRINT_OK)
  {
    displayStatus("Xoa ID: " + String(id));
    String jsonData = "{\"type\":\"delete_status\",\"id\":" + String(id) + ",\"status\":\"success\"}";
    webSocket.sendTXT(jsonData);
  }
  else
  {
    displayStatus("Xoa that bai");
    String jsonData = "{\"type\":\"delete_status\",\"id\":" + String(id) + ",\"status\":\"failed\"}";
    webSocket.sendTXT(jsonData);
  }
  delay(2000);
}

void showWelcomeScreen()
{
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Moi dat van tay");
  display.display();
}

void addFingerprint(int id)
{
  displayStatus("Dat ngon tay vao...");
  uint8_t p = finger.getImage();
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    delay(100);
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    displayStatus("Them van tay that bai");
    delay(2000);
    return;
  }

  displayStatus("Bo ngon tay...");
  delay(2000);

  p = finger.getImage();
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    delay(100);
  }

  displayStatus("Dat ngon tay vao lai...");
  p = finger.getImage();
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    delay(100);
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    displayStatus("Them van tay that bai");
    delay(2000);
    return;
  }

  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    displayStatus("Them van tay that bai");
    delay(2000);
    return;
  }

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    displayStatus("Da them ID: " + String(id));
    String jsonData = "{\"type\":\"add_status\",\"id\":" + String(id) + ",\"status\":\"success\"}";
    webSocket.sendTXT(jsonData);
    delay(2000);
    showWelcomeScreen();
  } else {
    displayStatus("Them van tay that bai");
    String jsonData = "{\"type\":\"add_status\",\"id\":" + String(id) + ",\"status\":\"failed\"}";
    webSocket.sendTXT(jsonData);
    delay(2000);
    showWelcomeScreen();
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length)
{
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WebSocket] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("[WebSocket] Connected to server!");
      sendFingerprintData();
      break;
    case WStype_TEXT:
      String message = String((char*)payload);
      Serial.println("[WebSocket] Received: " + message);
      
      if (message.startsWith("delete:")) {
        int idToDelete = message.substring(7).toInt();
        if (idToDelete > 0) {
          deleteFingerprint(idToDelete);
          sendFingerprintData();
        }
      }
      else if (message.startsWith("add:")) {
        int idToAdd = message.substring(4).toInt();
        if (idToAdd > 0) {
          addFingerprint(idToAdd);
          sendFingerprintData();
        }
      }
      break;
  }
}

void displayFingerprint(int id)
{
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Van tay ID:");
  display.println(id);
  display.display();
  
  String jsonData = "{\"type\":\"scan\",\"id\":" + String(id) + "}";
  webSocket.sendTXT(jsonData);
}

void setup()
{
  Serial.begin(115200);
  mySerial.begin(57600);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C))
  {
    Serial.println("OLED failed");
    for (;;);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Dang ket noi WiFi...");
  display.display();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Da ket noi WiFi");
  display.println(WiFi.localIP());
  display.display();
  delay(2000);

  showWelcomeScreen();

  finger.begin(57600);
  if (finger.verifyPassword())
  {
    Serial.println("Found fingerprint sensor!");
  }
  else
  {
    Serial.println("Fingerprint sensor not found!");
    while (1) delay(1);
  }

  // Initialize WebSocket
  webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(2000);
}

void loop()
{
  webSocket.loop();

  int fingerID = getFingerprintID();
  if (fingerID > 0)
  {
    displayFingerprint(fingerID);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(500);
    digitalWrite(BUZZER_PIN, LOW);
    sendToGoogleSheets(fingerID);
    delay(1500);
    showWelcomeScreen();
  }
  else if (fingerID == -1)
  {
    displayStatus("Khong nhan ra van tay");
    delay(2000);
    showWelcomeScreen();
  }

  delay(100);
}