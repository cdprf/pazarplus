/**
 * Script to create a basic default shipping template for testing
 */

const axios = require("axios");

const API_BASE_URL = "http://localhost:3000/api";

// Test configuration - Fresh token
const testConfig = {
  authToken:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk3NWRmYWViLWZkZGItNGJmZC1iODk1LWU5NmE4MTNiZGUyNSIsImlhdCI6MTc0OTQ1MjA4NCwic3Vic2NyaXB0aW9uUGxhbiI6InRyaWFsIiwicm9sZSI6InVzZXIiLCJleHAiOjE3NTAwNTY4ODQsImF1ZCI6InBhemFyLXBsdXMtY2xpZW50IiwiaXNzIjoicGF6YXItcGx1cyJ9.JQoMmv05UsbwJqn667x5xd5L-sJqR4Q7q2dANBR9CII",
};

const basicTemplate = {
  name: "Basic Shipping Template",
  description: "Default template for shipping slips",
  config: {
    name: "Basic Shipping Template",
    paperSize: "A4",
    orientation: "portrait",
    margin: 20,
    backgroundColor: "#ffffff",
  },
  elements: [
    // Company Header
    {
      id: "header_company",
      type: "text",
      content: "{{sender.company}}",
      position: { x: 5, y: 5 },
      size: { width: 40, height: 8 },
      style: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Order Number
    {
      id: "order_number",
      type: "text",
      content: "Order #: {{orderNumber}}",
      position: { x: 5, y: 15 },
      size: { width: 40, height: 6 },
      style: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Order Date
    {
      id: "order_date",
      type: "text",
      content: "Date: {{createdAt}}",
      position: { x: 5, y: 21 },
      size: { width: 40, height: 5 },
      style: {
        fontSize: 10,
        fontWeight: "normal",
        color: "#666666",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Shipping Address Header
    {
      id: "shipping_header",
      type: "text",
      content: "SHIP TO:",
      position: { x: 5, y: 30 },
      size: { width: 40, height: 6 },
      style: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Customer Name
    {
      id: "customer_name",
      type: "text",
      content: "{{shippingAddress.name}}",
      position: { x: 5, y: 38 },
      size: { width: 40, height: 5 },
      style: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Address
    {
      id: "address",
      type: "text",
      content: "{{shippingAddress.street}}",
      position: { x: 5, y: 44 },
      size: { width: 40, height: 5 },
      style: {
        fontSize: 10,
        fontWeight: "normal",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // City and Postal Code
    {
      id: "city_postal",
      type: "text",
      content: "{{shippingAddress.city}}, {{shippingAddress.postalCode}}",
      position: { x: 5, y: 50 },
      size: { width: 40, height: 5 },
      style: {
        fontSize: 10,
        fontWeight: "normal",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Phone
    {
      id: "phone",
      type: "text",
      content: "Phone: {{shippingAddress.phone}}",
      position: { x: 5, y: 56 },
      size: { width: 40, height: 5 },
      style: {
        fontSize: 10,
        fontWeight: "normal",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Tracking Number (if available)
    {
      id: "tracking_number",
      type: "text",
      content: "Tracking: {{tracking.number}}",
      position: { x: 55, y: 38 },
      size: { width: 40, height: 5 },
      style: {
        fontSize: 10,
        fontWeight: "normal",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Items Table Header
    {
      id: "items_header",
      type: "text",
      content: "ITEMS:",
      position: { x: 5, y: 68 },
      size: { width: 90, height: 6 },
      style: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#000000",
        textAlign: "left",
      },
      zIndex: 1,
    },

    // Table (simplified - will need custom rendering)
    {
      id: "items_table",
      type: "table",
      content: "{{items}}",
      position: { x: 5, y: 76 },
      size: { width: 90, height: 20 },
      style: {
        fontSize: 9,
        fontWeight: "normal",
        color: "#000000",
        borderColor: "#cccccc",
        headerBackground: "#f5f5f5",
      },
      columns: [
        { field: "product.name", header: "Product", width: 50 },
        { field: "quantity", header: "Qty", width: 15 },
        { field: "unitPrice", header: "Price", width: 20 },
        { field: "totalPrice", header: "Total", width: 20 },
      ],
      zIndex: 1,
    },
  ],
};

async function createBasicTemplate() {
  console.log("📝 Creating basic shipping template...\n");

  try {
    const api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${testConfig.authToken}`,
        "Content-Type": "application/json",
      },
    });

    // Create the template
    console.log("1️⃣ Creating template...");
    const createResponse = await api.post("/shipping/templates", basicTemplate);
    console.log("✅ Template created successfully");
    console.log("📄 Template ID:", createResponse.data.data.id);

    // Set as default
    console.log("\n2️⃣ Setting as default template...");
    const defaultResponse = await api.post("/shipping/templates/default", {
      templateId: createResponse.data.data.id,
    });
    console.log("✅ Template set as default");

    console.log("\n🎉 Basic template setup completed!");
    console.log("💡 You can now test the print functionality");
  } catch (error) {
    console.error(
      "❌ Failed to create template:",
      error.response?.data?.message || error.message
    );

    if (testConfig.authToken === "YOUR_JWT_TOKEN_HERE") {
      console.log(
        "\n💡 Please update the authToken in testConfig with a valid JWT token"
      );
      console.log("   1. Login to the application");
      console.log("   2. Get the token from localStorage");
      console.log("   3. Update testConfig.authToken in this script");
    }
  }
}

createBasicTemplate();
