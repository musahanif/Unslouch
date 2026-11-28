# Bluetooth version of receiver.py: connects to the "Unslouch" device over BLE
# and saves one 60 s recording in exactly the same CSV format as before.
# Needs: pip install bleak
import asyncio                   # bleak works "asynchronously" (waits without freezing)
import csv
import math
import os
import struct                    # unpacks the 16-byte packets from the ESP32
from datetime import datetime

from bleak import BleakClient, BleakScanner   # the Bluetooth library

DEVICE_NAME = "Unslouch"         # must match BLEDevice::init("...") in the firmware
DATA_UUID = "7d2c0002-5b1e-4f6a-9c3d-2e8f1a4b6c90"   # must match DATA_UUID in the firmware
DURATION = 60                    # seconds of device time to record
G = 9.80665
HEADER = ["t_ms", "ax", "ay", "az", "gx", "gy", "gz", "pitch", "roll", "label", "person"]

label = input("Label (e.g. sit_upright): ").strip()
person = input("Person (e.g. aurel): ").strip()
rows = []                        # collected readings
t0 = None                        # device time of the first reading
done = asyncio.Event()           # becomes "set" when 60 s are collected


def on_packet(_, data: bytearray):   # runs for EVERY reading the ESP32 sends (20 per second)
    global t0
    if len(data) != 16 or done.is_set():
        return                   # broken packet, or already finished
    t, rax, ray, raz, rgx, rgy, rgz = struct.unpack("<I6h", data)
    # "<I6h" = little-endian: one 4-byte unsigned int (time), then six 2-byte signed ints
    ax, ay, az = rax / 4096 * G, ray / 4096 * G, raz / 4096 * G     # same as the Wi-Fi firmware: m/s^2
    gx, gy, gz = rgx / 65.5, rgy / 65.5, rgz / 65.5                 # deg/s
    pitch = math.degrees(math.atan2(-ax, math.sqrt(ay * ay + az * az)))   # same formulas
    roll = math.degrees(math.atan2(ay, az))
    if t0 is None:
        t0 = t
        print("Recording...")
    if t - t0 >= DURATION * 1000:
        done.set()               # 60 s reached -> stop
        return
    rows.append([t] + [round(v, 2) for v in (ax, ay, az, gx, gy, gz, pitch, roll)] + [label, person])
    if len(rows) % 100 == 0:     # progress every 5 s
        print(f"  {len(rows)} readings ({(t - t0) / 1000:.0f} s)")


async def main():
    print(f"Searching for '{DEVICE_NAME}' (switch the device ON)...")
    device = await BleakScanner.find_device_by_name(DEVICE_NAME, timeout=20)
    if device is None:
        raise SystemExit("Device not found. Is it ON, and is Bluetooth on in Windows?")
    async with BleakClient(device) as client:      # connect; disconnects by itself at the end
        print("Connected. Get into position; recording starts now.")
        await client.start_notify(DATA_UUID, on_packet)   # "send me every reading"
        await asyncio.wait_for(done.wait(), timeout=DURATION + 30)   # wait until 60 s collected


asyncio.run(main())

os.makedirs("data", exist_ok=True)
filename = f"data/{person}_{label}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
with open(filename, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(HEADER)
    writer.writerows(rows)
print(f"Saved {len(rows)} rows to {filename}")
print(f"Average rate: {len(rows) / DURATION:.1f} Hz (expect about 20)")
