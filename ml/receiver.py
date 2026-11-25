# Wireless version of record.py: receives readings from the ESP32 over Wi-Fi
# and saves one 60 s recording in exactly the same CSV format as before.
import csv
import os
import socket
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 5000                      # must match SERVER_URL in the firmware
DURATION = 60                    # seconds of device time to record
HEADER = ["t_ms", "ax", "ay", "az", "gx", "gy", "gz", "pitch", "roll", "label", "person"]

label = input("Label (e.g. sit_upright): ").strip()
person = input("Person (e.g. aurel): ").strip()
rows = []                        # collected readings
t0 = None                        # device time of the first reading
done = False


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):           # runs every time the ESP32 sends a batch
        global t0, done
        body = self.rfile.read(int(self.headers["Content-Length"])).decode(errors="ignore")
        self.send_response(200)  # tell the ESP32 "received"
        self.end_headers()
        for line in body.strip().splitlines():
            parts = line.split(",")
            if len(parts) != 9:  # skip broken lines
                continue
            try:
                values = [float(p) for p in parts]
            except ValueError:
                continue
            t = int(values[0])
            if t0 is None:
                t0 = t
                print("Recording...")
            if t - t0 >= DURATION * 1000:
                done = True
                return
            rows.append([t] + values[1:] + [label, person])
        print(f"  {len(rows)} readings ({(rows[-1][0] - t0) / 1000:.0f} s)" if rows else "  waiting")

    def log_message(self, *args):   # silence the default request log
        pass


ip = socket.gethostbyname(socket.gethostname())
print(f"Receiver on http://{ip}:{PORT}/ingest  (put this IP in the firmware's SERVER_URL)")
print("Get into position; recording starts when the first batch arrives.")
server = HTTPServer(("0.0.0.0", PORT), Handler)
while not done:
    server.handle_request()      # handle one batch at a time until 60 s are collected

os.makedirs("data", exist_ok=True)
filename = f"data/{person}_{label}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
with open(filename, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(HEADER)
    writer.writerows(rows)
print(f"Saved {len(rows)} rows to {filename}")
print(f"Average rate: {len(rows) / DURATION:.1f} Hz (expect about 19-20)")
