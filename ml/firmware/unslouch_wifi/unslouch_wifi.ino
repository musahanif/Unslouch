// Unslouch wireless firmware: reads the IMU at an exact 20 Hz and sends
// batches of readings over Wi-Fi to the laptop receiver (receiver.py).

#include <Wire.h>          // I2C: talks to the sensor
#include <WiFi.h>          // Wi-Fi connection
#include <HTTPClient.h>    // sends data with HTTP POST

// ---------- settings: CHANGE THESE ----------
const char* WIFI_SSID = "Aurel";      // use your phone hotspot (campus Wi-Fi usually won't work)
const char* WIFI_PASS = "ribetluah";
const char* SERVER_URL = "http://172.20.10.3:5000/ingest";   // laptop IP (see `ipconfig`) + receiver port
// ---------------------------------------------

const uint8_t MPU_ADDR = 0x68;        // sensor I2C address (AD0 to GND)
const uint32_t SAMPLE_MS = 50;        // 50 ms between readings = exactly 20 Hz
const int BATCH_SIZE = 100;           // send every 100 readings = every 5 seconds

String batch;                          // the readings waiting to be sent, as CSV lines
int batchCount = 0;                    // how many readings are in the batch
uint32_t nextSample = 0;               // when the next reading is due (millis)

void writeReg(uint8_t reg, uint8_t value) {   // write one sensor setting
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

void connectWiFi() {                    // connect (or reconnect) to Wi-Fi
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {   // try for max 15 s
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\nConnected, ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWi-Fi failed, will retry at next send");
  }
}

void sendBatch() {                      // POST the collected readings to the laptop
  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return;      // no Wi-Fi: this batch is dropped
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "text/csv");
  http.setTimeout(2000);                // don't wait more than 2 s for the laptop
  int code = http.POST(batch);          // send all lines in one request
  Serial.printf("Sent %d readings -> HTTP %d\n", batchCount, code);   // 200 = OK
  http.end();
}

void setup() {
  Serial.begin(115200);                 // USB serial still works, for debugging
  Wire.begin(25, 26);                   // SDA = GPIO25, SCL = GPIO26 (same wiring as before)
  writeReg(0x6B, 0x00);                 // wake the sensor
  writeReg(0x1C, 0x10);                 // accelerometer range +-8 g
  writeReg(0x1B, 0x08);                 // gyroscope range +-500 deg/s
  WiFi.mode(WIFI_STA);                  // ESP32 joins a network (not its own hotspot)
  connectWiFi();
  batch.reserve(BATCH_SIZE * 70);       // reserve memory once (~70 chars per line)
  nextSample = millis();
}

void loop() {
  if ((int32_t)(millis() - nextSample) < 0) return;   // not time for the next reading yet
  nextSample += SAMPLE_MS;                             // schedule the next one exactly 50 ms later

  Wire.beginTransmission(MPU_ADDR);     // read 14 bytes starting at 0x3B
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)14);
  int16_t raw[7];
  for (int i = 0; i < 7; i++) raw[i] = (Wire.read() << 8) | Wire.read();
  // raw: ax, ay, az, temperature (ignored), gx, gy, gz

  float ax = raw[0] / 4096.0 * 9.80665, ay = raw[1] / 4096.0 * 9.80665, az = raw[2] / 4096.0 * 9.80665;   // m/s^2
  float gx = raw[4] / 65.5, gy = raw[5] / 65.5, gz = raw[6] / 65.5;                                      // deg/s
  float pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;   // same formulas as the old sketch
  float roll = atan2(ay, az) * 180.0 / PI;

  char line[100];                       // same 9 values as before: millis,ax,ay,az,gx,gy,gz,pitch,roll
  snprintf(line, sizeof(line), "%lu,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f\n",
           (unsigned long)millis(), ax, ay, az, gx, gy, gz, pitch, roll);
  batch += line;
  batchCount++;

  if (batchCount >= BATCH_SIZE) {       // 5 seconds collected -> send
    sendBatch();
    batch = "";
    batchCount = 0;
    nextSample = millis();              // sending takes time; restart the 20 Hz clock after it
  }
}
