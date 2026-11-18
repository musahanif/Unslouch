"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/elements/QrScanner";
import { getCurrentUser } from "@/lib/api/auth-api";
import {
  pairDevice,
  type DeviceCredential,
  type PairedDevice,
} from "@/lib/api/pair-api";
import { RequestFailure } from "@/lib/api-request";

type PairingMethod = "input" | "scan" | "bluetooth";

const parseQrPayload = (payload: string) => {
  const value = payload.trim();

  // QR format:
  // UNSLOUCH:SERIAL_NUMBER:SETUP_CODE
  if (value.startsWith("UNSLOUCH:")) {
    const [, serialNumber, setupCode] = value.split(":");

    if (serialNumber && setupCode) {
      return { serialNumber, setupCode };
    }
  }

  // Alternative JSON QR format:
  // {"serialNumber":"...","setupCode":"..."}
  try {
    const parsed = JSON.parse(value) as {
      serialNumber?: string;
      setupCode?: string;
    };

    if (parsed.serialNumber && parsed.setupCode) {
      return {
        serialNumber: parsed.serialNumber,
        setupCode: parsed.setupCode,
      };
    }
  } catch {
    // Continue to the validation error.
  }

  throw new Error(
    "Invalid QR code. Expected UNSLOUCH:SERIAL_NUMBER:SETUP_CODE.",
  );
};

export default function PairingPage() {
  const router = useRouter();

  const [method, setMethod] = useState<PairingMethod>("input");
  const [serialNumber, setSerialNumber] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null);
  const [credential, setCredential] = useState<DeviceCredential | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        await getCurrentUser();
      } catch {
        router.replace("/login");
      }
    };

    void checkAuthentication();
  }, [router]);

  const runPairing = useCallback(
    async (nextSerialNumber: string, nextSetupCode: string) => {
      setMessage(null);
      setIsError(false);
      setIsSubmitting(true);

      try {
        const result = await pairDevice(nextSerialNumber, nextSetupCode);

        setPairedDevice(result.device);
        setCredential(result.credential);
        setMessage(
          "Device paired successfully. Transfer the shown credential to the ESP32 now.",
        );
      } catch (error) {
        setIsError(true);
        setMessage(
          error instanceof RequestFailure || error instanceof Error
            ? error.message
            : "Device pairing failed. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runPairing(serialNumber, setupCode);
  };

  const handleQrDecoded = useCallback(
    async (value: string) => {
      try {
        const result = parseQrPayload(value);

        setSerialNumber(result.serialNumber);
          setSetupCode(result.setupCode);
          
        setMethod("input");
        await runPairing(result.serialNumber, result.setupCode);
      } catch (error) {
        setIsError(true);
        setMessage(
          error instanceof Error ? error.message : "QR code is invalid.",
        );
      }
    },
    [runPairing],
  );

  const handleScannerError = useCallback((error: string) => {
    setIsError(true);
    setMessage(
      `Unable to start the camera scanner: ${error}. Check camera permission and use HTTPS or localhost.`,
    );
  }, []);

  const selectMethod = (nextMethod: PairingMethod) => {
    setMethod(nextMethod);
    setMessage(null);
    setIsError(false);
    setPairedDevice(null);
    setCredential(null);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <Link
          href="/home"
          className="text-sm font-medium text-[#094A44] hover:underline">
          ← Back to dashboard
        </Link>

        <p className="mt-6 text-sm font-semibold tracking-widest text-[#45726D]">
          UNSLOUCH DEVICE
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Pair a device
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Connect an Unslouch wearable to this account.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => selectMethod("input")}
            className={`rounded-xl border p-4 text-left transition ${
              method === "input"
                ? "border-[#094A44] bg-emerald-50 ring-2 ring-[#094A44]/20"
                : "border-slate-200 hover:border-[#45726D]"
            }`}>
            <p className="font-semibold text-slate-900">Enter code</p>
            <p className="mt-1 text-xs text-slate-600">
              Use the serial number and setup code.
            </p>
          </button>

          <button
            type="button"
            onClick={() => selectMethod("scan")}
            className={`rounded-xl border p-4 text-left transition ${
              method === "scan"
                ? "border-[#094A44] bg-emerald-50 ring-2 ring-[#094A44]/20"
                : "border-slate-200 hover:border-[#45726D]"
            }`}>
            <p className="font-semibold text-slate-900">Scan QR code</p>
            <p className="mt-1 text-xs text-slate-600">
              Scan the label with the camera.
            </p>
          </button>

          <button
            type="button"
            onClick={() => selectMethod("bluetooth")}
            className={`rounded-xl border p-4 text-left transition ${
              method === "bluetooth"
                ? "border-[#094A44] bg-emerald-50 ring-2 ring-[#094A44]/20"
                : "border-slate-200 hover:border-[#45726D]"
            }`}>
            <p className="font-semibold text-slate-900">Bluetooth</p>
            <p className="mt-1 text-xs text-slate-600">
              Transfer credentials to the ESP32.
            </p>
          </button>
        </div>

        {method === "input" && (
          <form className="mt-7 space-y-5" onSubmit={handleManualSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Device serial number
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-[#094A44] focus:ring-2 focus:ring-[#094A44]/20"
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
                placeholder="Example: UNSLOUCH-001"
                minLength={4}
                maxLength={100}
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              One-time setup code
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-[#094A44] focus:ring-2 focus:ring-[#094A44]/20"
                value={setupCode}
                onChange={(event) => setSetupCode(event.target.value)}
                placeholder="Code printed on the device label"
                minLength={12}
                maxLength={128}
                required
              />
            </label>

            <button
              className="w-full rounded-lg bg-[#094A44] px-4 py-2.5 font-semibold text-white hover:bg-[#063a35] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}>
              {isSubmitting ? "Pairing device..." : "Pair device"}
            </button>
          </form>
        )}

        {method === "scan" && (
          <div className="mt-7">
            <QrScanner
              onDecoded={handleQrDecoded}
              onError={handleScannerError}
            />

            <p className="mt-3 text-xs text-slate-500">
              Expected QR format: <code>UNSLOUCH:SERIAL_NUMBER:SETUP_CODE</code>
            </p>
          </div>
        )}

        {method === "bluetooth" && (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-amber-900">
              Bluetooth provisioning is not available yet
            </p>
            <p className="mt-2 text-sm text-amber-800">
              Bluetooth requires ESP32 firmware with a GATT provisioning
              service, including its service UUID and credential-write
              characteristic UUID. The pairing backend is ready, but the
              firmware contract must be added first.
            </p>
          </div>
        )}

        {message && (
          <div
            className={`mt-6 rounded-xl p-4 text-sm ${
              isError
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-800"
            }`}>
            {message}
          </div>
        )}

        {pairedDevice && credential && (
          <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-semibold text-emerald-900">
              Device paired: {pairedDevice.serial_number}
            </h2>

            <p className="mt-3 text-sm font-medium text-red-700">
              Transfer this credential to the ESP32 now. It is shown only once.
              Do not save it in browser local storage.
            </p>

            <dl className="mt-4 space-y-3 rounded-lg bg-white p-4 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Device ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-900">
                  {credential.deviceId}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-slate-500">Device secret</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-900">
                  {credential.secret}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-slate-500">
                  Authorization header
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-900">
                  {credential.authorization}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </section>
    </main>
  );
}
