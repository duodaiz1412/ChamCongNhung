#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_Fingerprint.h>

const char *ssid = "Xom Tro Vui Ve";
const char *password = "maiduy0507";
const char *googleScriptURL = "https://script.google.com/macros/s/AKfycbz-Blo_AXMJUbi5KJ-ei2G0Xv1wFfckK-zp2iLgd6Q_jujLE_h3WGQ_nxBOYgKWDuatxg/exec";
const char *SERVER_URL = "http://192.168.1.6:3000";

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define BUZZER_PIN D7 // Định nghĩa chân D7 cho còi

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

SoftwareSerial mySerial(D5, D6);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

int getFingerprintID()
{
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) // Không có vân tay được đặt
    return 0; // Trả về 0 thay vì -1 để biểu thị không có hành động quét
  if (p != FINGERPRINT_OK) // Có lỗi khi lấy hình ảnh vân tay
    return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK)
    return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)
    return -1;

  return finger.fingerID; // Trả về ID nếu tìm thấy
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
      // Serial.println("Google Sheets response: " + response);
    }
    http.end();
  }
}

void sendFingerprintData()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    WiFi.reconnect();
    delay(2000);
    return;
  }

  WiFiClient client;
  HTTPClient http;

  client.setTimeout(5000);
  String fullURL = String(SERVER_URL) + "/api/fingerprints";

  finger.getTemplateCount();
  uint16_t templateCount = finger.templateCount;
  String jsonData = "{\"count\":" + String(templateCount) + ",\"ids\":[";

  bool first = true;
  for (int id = 1; id <= 127; id++)
  {
    if (finger.loadModel(id) == FINGERPRINT_OK && finger.fingerFastSearch() == FINGERPRINT_OK)
    {
      if (!first)
        jsonData += ",";
      jsonData += String(id);
      first = false;
    }
  }
  jsonData += "]}";

  if (http.begin(client, fullURL))
  {
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST(jsonData);
    if (httpCode > 0)
    {
      String payload = http.getString();
      Serial.println("Fingerprint response: " + payload);
    }
    http.end();
  }
}

void deleteFingerprint(int id)
{
  uint8_t p = finger.deleteModel(id);
  if (p == FINGERPRINT_OK)
  {
    displayStatus("Deleted ID: " + String(id));
  }
  else
  {
    displayStatus("Delete Failed");
  }
  delay(2000);
}

void addFingerprint(int id) {
  displayStatus("Place finger...");
  uint8_t p = finger.getImage();
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    delay(100);
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    displayStatus("Add Failed");
    delay(2000);
    return;
  }

  displayStatus("Remove finger...");
  delay(2000);

  p = finger.getImage();
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    delay(100);
  }

  displayStatus("Place same finger...");
  p = finger.getImage();
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    delay(100);
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    displayStatus("Add Failed");
    delay(2000);
    return;
  }

  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    displayStatus("Add Failed");
    delay(2000);
    return;
  }

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    displayStatus("Added ID: " + String(id));
    
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;
      HTTPClient http;
      String fullURL = String(SERVER_URL) + "/api/fingerprints";
      String message = "Thêm vân tay #" + String(id) + " thành công";
      String jsonData = "{\"count\":" + String(finger.templateCount) + ",\"ids\":[" + String(id) + "],\"message\":\"" + message + "\"}";

      if (http.begin(client, fullURL)) {
        http.addHeader("Content-Type", "application/json");
        int httpCode = http.POST(jsonData);
        if (httpCode > 0) {
          String payload = http.getString();
          Serial.println("Fingerprint response: " + payload);
        }
        http.end();
      }
    }
  } else {
    displayStatus("Add Failed");
  }
  delay(2000);
}

void checkDeleteCommand()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    WiFiClient client;
    HTTPClient http;

    String fullURL = String(SERVER_URL) + "/api/delete-fingerprint";
    if (http.begin(client, fullURL))
    {
      http.addHeader("Content-Type", "application/json");
      int httpCode = http.GET();
      if (httpCode > 0)
      {
        String response = http.getString();
        if (response.length() > 0)
        {
          Serial.println("Delete message from BE: " + response);
          int idToDelete = response.toInt();
          if (idToDelete > 0)
          {
            deleteFingerprint(idToDelete);
            sendFingerprintData();
          }
        }
      }
      http.end();
    }
  }
}

void checkAddCommand()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    WiFiClient client;
    HTTPClient http;

    String fullURL = String(SERVER_URL) + "/api/add-fingerprint";
    if (http.begin(client, fullURL))
    {
      http.addHeader("Content-Type", "application/json");
      int httpCode = http.GET();
      if (httpCode > 0)
      {
        String response = http.getString();
        if (response.length() > 0)
        {
          Serial.println("Add message from BE: " + response);
          int idToAdd = response.toInt();
          if (idToAdd > 0)
          {
            addFingerprint(idToAdd);
            sendFingerprintData();
          }
        }
      }
      http.end();
    }
  }
}

void displayFingerprint(int id)
{
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Fingerprint ID:");
  display.println(id);
  display.display();
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

void setup()
{
  Serial.begin(115200);
  mySerial.begin(57600);

  pinMode(BUZZER_PIN, OUTPUT); // Cấu hình chân D7 làm OUTPUT cho còi
  digitalWrite(BUZZER_PIN, LOW); // Tắt còi mặc định

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C))
  {
    Serial.println("OLED failed");
    for (;;)
      ;
  }
  showWelcomeScreen();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  finger.begin(57600);
  if (finger.verifyPassword())
  {
    Serial.println("Found fingerprint sensor!");
    sendFingerprintData();
  }
  else
  {
    Serial.println("Fingerprint sensor not found!");
    while (1)
      delay(1);
  }
}

void loop()
{
  int fingerID = getFingerprintID();
  if (fingerID > 0) // Vân tay hợp lệ
  {
    displayFingerprint(fingerID);
    digitalWrite(BUZZER_PIN, HIGH); // Bật còi
    delay(500); // Kêu trong 0.5 giây
    digitalWrite(BUZZER_PIN, LOW); // Tắt còi
    sendToGoogleSheets(fingerID);
    delay(1500); // Tổng thời gian hiển thị ID là 2 giây (0.5s còi + 1.5s chờ)
    showWelcomeScreen();
  }
  else if (fingerID == -1) // Vân tay không hợp lệ
  {
    displayStatus("Khong nhan ra van tay");
    delay(2000); // Giảm từ 5s xuống 2s
    showWelcomeScreen();
  }
  // Nếu fingerID == 0 thì không làm gì, giữ nguyên màn "Mời đặt vân tay"

  checkDeleteCommand();
  checkAddCommand();
  delay(1000);
}