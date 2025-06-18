import React from "react";
import BarcodeRenderer from "./components/shipping/designer/components/BarcodeRenderer";

/**
 * Debug Component for Barcode Rendering
 *
 * To use this for debugging:
 * 1. Set breakpoints in BarcodeRenderer.jsx
 * 2. Start the React app: npm start
 * 3. Navigate to http://localhost:3000/debug-barcode
 * 4. Open Chrome DevTools (F12)
 * 5. Use the Sources tab to debug
 */
const BarcodeDebugger = () => {
  const testCases = [
    {
      name: "Basic CODE128",
      content: "123456789012",
      type: "code128",
      width: 200,
      height: 100,
    },
    {
      name: "EAN13",
      content: "123456789012",
      type: "ean13",
      width: 200,
      height: 100,
    },
    {
      name: "Large Barcode",
      content: "HELLO123",
      type: "code39",
      width: 300,
      height: 150,
    },
    {
      name: "Small Barcode",
      content: "12345",
      type: "code128",
      width: 150,
      height: 50,
    },
  ];

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🔧 Barcode Renderer Debug Tool</h1>
      <p>
        Open Chrome DevTools (F12) and check the Console tab for debug logs.
      </p>
      <p>
        Set breakpoints in <code>BarcodeRenderer.jsx</code> to step through the
        code.
      </p>

      <div
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        {testCases.map((testCase, index) => (
          <div
            key={index}
            style={{
              border: "2px solid #ddd",
              padding: "15px",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h3>{testCase.name}</h3>
            <div
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                backgroundColor: "white",
                minHeight: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarcodeRenderer {...testCase} />
            </div>
            <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
              <strong>Props:</strong> {JSON.stringify(testCase, null, 2)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#e8f4fd",
          borderRadius: "8px",
        }}
      >
        <h3>🎯 Debug Instructions:</h3>
        <ol>
          <li>Open Chrome DevTools (F12)</li>
          <li>
            Go to the <strong>Sources</strong> tab
          </li>
          <li>
            Navigate to{" "}
            <code>
              src/components/shipping/designer/components/BarcodeRenderer.jsx
            </code>
          </li>
          <li>Set breakpoints by clicking on line numbers</li>
          <li>Refresh this page to trigger the breakpoints</li>
          <li>Use the console to inspect variables and state</li>
        </ol>
      </div>
    </div>
  );
};

export default BarcodeDebugger;
