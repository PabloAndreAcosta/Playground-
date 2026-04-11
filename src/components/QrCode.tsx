"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  data: string;
  size?: number;
}

export function QrCodeDisplay({ data, size = 200 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: size,
        margin: 2,
        color: {
          dark: "#1a1025",
          light: "#ffffff",
        },
      });
    }
  }, [data, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl mx-auto"
      style={{ width: size, height: size }}
    />
  );
}
