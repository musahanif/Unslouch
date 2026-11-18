"use client";

import { useEffect } from "react";

type QrScannerProps = {
  onDecoded: (value: string) => void;
  onError: (message: string) => void;
};

export function QrScanner({ onDecoded, onError }: QrScannerProps) {
  useEffect(() => {
    let isActive = true;
    let hasStarted = false;

    let scanner: {
      start: (
        cameraIdOrConfig: { facingMode: string },
        config: { fps: number; qrbox: { width: number; height: number } },
        onSuccess: (decodedText: string) => void,
        onFailure: () => void,
      ) => Promise<unknown>;
      stop: () => Promise<void>;
    } | null = null;

    const stopScanner = async () => {
      if (!scanner || !hasStarted) {
        return;
      }

      const currentScanner = scanner;
      hasStarted = false;

      await currentScanner.stop().catch(() => undefined);
    };

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!isActive) {
          return;
        }

        scanner = new Html5Qrcode("pairing-qr-reader");

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText) => {
            if (!isActive) {
              return;
            }

            isActive = false;
            await stopScanner();

            onDecoded(decodedText);
          },
          () => {
            // Ignore frames that do not contain a QR code.
          },
        );

        hasStarted = true;

        // The user might leave the scan page before the camera starts.
        if (!isActive) {
          await stopScanner();
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        onError(
          error instanceof Error
            ? error.message
            : "Camera access could not be started.",
        );
      }
    };

    void startScanner();

    return () => {
      isActive = false;

      // React cleanup cannot await, but stopping the camera still runs safely.
      void stopScanner();
    };
  }, [onDecoded, onError]);

  return (
    <div
      id="pairing-qr-reader"
      className="overflow-hidden rounded-xl bg-slate-100"
    />
  );
}
