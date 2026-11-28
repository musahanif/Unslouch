// Unslouch Bluetooth (BLE) firmware: reads the IMU at an exact 20 Hz and sends
// every reading to the laptop (receiver_ble.py) as a BLE notification.
// The laptop connects to the device by its name "Unslouch".

#include <Wire.h>          // I2C: talks to the sensor
#include <BLEDevice.h>     // the ESP32's built-in Bluetooth Low Energy library
#include <BLEServer.h>     // lets the ESP32 accept a connection (it is the "server")
#include <BLE2902.h>       // the switch the laptop flips to say "send me notifications"

// Our own random IDs. receiver_ble.py uses the SAME two values to find the data.
#define SERVICE_UUID "7d2c0001-5b1e-4f6a-9c3d-2e8f1a4b6c90"   // the "Unslouch" service
#define DATA_UUID    "7d2c0002-5b1e-4f6a-9c3d-2e8f1a4b6c90"   // the sensor-data channel inside it

const uint8_t MPU_ADDR = 0x68;        // sensor I2C address (AD0 to GND)
const uint32_t SAMPLE_MS = 50;        // 50 ms between readings = exactly 20 Hz

BLECharacteristic* dataChar;          // the channel we push readings into
bool connected = false;               // is a laptop/phone connected right now?
uint32_t nextSample = 0;              // when the next reading is due (millis)

class ConnectionEvents : public BLEServerCallbacks {   // runs when someone connects/leaves
  void onConnect(BLEServer* server) {
    connected = true;
    Serial.println("Connected");
  }
  void onDisconnect(BLEServer* server) {
    connected = false;
    Serial.println("Disconnected, advertising again");
    BLEDevice::startAdvertising();    // become visible again so the laptop can reconnect
  }
};

void writeReg(uint8_t reg, uint8_t value) {   // write one sensor setting
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

void setup() {
  Serial.begin(115200);                 // USB serial still works, for debugging
  Wire.begin(25, 26);                   // SDA = GPIO25, SCL = GPIO26 (same wiring as before)
  writeReg(0x6B, 0x00);                 // wake the sensor
  writeReg(0x1C, 0x10);                 // accelerometer range +-8 g
  writeReg(0x1B, 0x08);                 // gyroscope range +-500 deg/s

  BLEDevice::init("Unslouch");          // the name the laptop searches for
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ConnectionEvents());
  BLEService* service = server->createService(SERVICE_UUID);
  dataChar = service->createCharacteristic(DATA_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  // NOTIFY = the ESP32 pushes data by itself; the laptop doesn't have to ask each time
  dataChar->addDescriptor(new BLE2902());
  service->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);    // announce "I have the Unslouch service"
  BLEDevice::startAdvertising();        // start being visible
  Serial.println("Advertising as 'Unslouch', waiting for receiver_ble.py");
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

  if (!connected) return;               // nobody listening: don't send

  // Pack ONE reading into 16 bytes: time (4 bytes) + 6 raw values (2 bytes each).
  // A BLE message only holds 20 bytes by default, so we send raw numbers, not text.
  // receiver_ble.py converts them to m/s^2, deg/s, pitch and roll with the SAME formulas.
  uint8_t packet[16];
  uint32_t t = millis();
  memcpy(packet, &t, 4);                // bytes 0-3: device time in ms
  int16_t vals[6] = {raw[0], raw[1], raw[2], raw[4], raw[5], raw[6]};   // ax ay az gx gy gz
  memcpy(packet + 4, vals, 12);         // bytes 4-15: the six raw sensor values
  dataChar->setValue(packet, sizeof(packet));
  dataChar->notify();                   // push it to the laptop
}
