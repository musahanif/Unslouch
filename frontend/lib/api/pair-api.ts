import { request } from "@/lib/api/client";

export type PairedDevice = {
  device_id: string;
  serial_number: string;
  mac_address: string | null;
  device_model: string | null;
  firmware_version: string | null;
  is_active: boolean;
  paired_at: string | null;
  battery_level: number | null;
  last_seen_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeviceCredential = {
  deviceId: string;
  secret: string;
  authorization: string;
  expiresAt?: string;
};

export const pairDevice = async (
  serialNumber: string,
  setupCode: string,
) =>
  request<{
    device: PairedDevice;
    credential: DeviceCredential;
  }>("/api/devices/pair", {
    method: "POST",
    body: JSON.stringify({
      serialNumber,
      setupCode,
    }),
  });