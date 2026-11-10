import { prisma, disconnectDB } from "../src/config/db.js";
import {
  generateSetupCode,
  hashSetupCode,
} from "../src/utils/deviceCredentials.js";

const [serialArgument, modelArgument = "ESP32-MPU6050"] =
  process.argv.slice(2);

if (!serialArgument) {
  console.error(
    "Usage: node scripts/provision-device.js <SERIAL_NUMBER> [DEVICE_MODEL]",
  );
  process.exit(1);
}

const serialNumber = serialArgument.trim().toUpperCase();
const setupCode = generateSetupCode();

try {
  const existingDevice = await prisma.device.findUnique({
    where: { serial_number: serialNumber },
    select: { device_id: true },
  });

  if (existingDevice) {
    throw new Error("A device with this serial number already exists");
  }

  const device = await prisma.device.create({
    data: {
      serial_number: serialNumber,
      device_model: modelArgument,
      setup_code_hash: hashSetupCode(setupCode),
    },
    select: {
      device_id: true,
      serial_number: true,
      device_model: true,
    },
  });

  console.log("Provisioned device:");
  console.log(JSON.stringify(device, null, 2));
  console.log("");
  console.log("One-time setup code:");
  console.log(setupCode);
  console.log("");
  console.log("Store this code securely or place it in the device QR label.");
} catch (error) {
  console.error("Device provisioning failed:", error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}