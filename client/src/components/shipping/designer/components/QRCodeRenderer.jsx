import logger from "../../../../utils/logger";
import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";

const QRCodeRenderer = ({
  content = "https://example.com",
  size = 120,
  errorCorrectionLevel = "M",
  quietZone = 4,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && content) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Generate QR code
      QRCode.toCanvas(
        canvas,
        content,
        {
          width: size,
          margin: quietZone,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: errorCorrectionLevel,
        },
        (error) => {
          if (error) {
            logger.error("QR Code generation error:", error);
            // Fallback: draw a simple placeholder
            ctx.fillStyle = "#f3f4f6";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#d1d5db";
            ctx.strokeRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#6b7280";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText("QR Code", canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillText("Error", canvas.width / 2, canvas.height / 2 + 10);
          }
        }
      );
    }
  }, [content, size, errorCorrectionLevel, quietZone]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          border: "1px solid #e5e7eb",
        }}
      />
    </div>
  );
};

export default QRCodeRenderer;
