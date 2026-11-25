import csv
import os
import time
from datetime import datetime

import serial  # comes from the pyserial package

PORT = "COM5"      # same port as in Arduino IDE
BAUD = 115200      # must match Serial.begin() in the sketch
DURATION = 60      # seconds to record
HEADER = ["t_ms", "ax", "ay", "az", "gx", "gy", "gz", "pitch", "roll", "label", "person"]

label = input("Label (e.g. sit_upright): ").strip()
person = input("Person (e.g. aurel): ").strip()

os.makedirs("data", exist_ok=True)
stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"data/{person}_{label}_{stamp}.csv"

ser = serial.Serial(PORT, BAUD, timeout=1)
time.sleep(2)  # opening the port restarts the ESP32, so wait for it to boot

for s in range(5, 0, -1):
    print(f"Get into position... {s}")
    time.sleep(1)

ser.reset_input_buffer()  # discard anything received during the countdown
print("Recording...")

rows = []
t0 = None
wait_start = time.time()
while True:
    if t0 is None and time.time() - wait_start > 10:
        raise SystemExit("No data received. Is the Serial Monitor closed?")
    line = ser.readline().decode(errors="ignore").strip()
    parts = line.split(",")
    if len(parts) != 9:
        continue          # skips "MPU ready." and broken lines
    try:
        values = [float(p) for p in parts]
    except ValueError:
        continue
    t = int(values[0])
    if t0 is None:
        t0 = t
    if t - t0 >= DURATION * 1000:
        break
    rows.append([t] + values[1:] + [label, person])

ser.close()

with open(filename, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(HEADER)
    writer.writerows(rows)

print(f"Saved {len(rows)} rows to {filename}")
print(f"Average rate: {len(rows) / DURATION:.1f} Hz (expect about 18-20)")