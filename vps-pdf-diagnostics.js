#!/usr/bin/env node

/**
 * VPS PDF Diagnostics Script
 * Run this on your VPS to diagnose PDF serving issues
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 VPS PDF Diagnostics Starting...\n");

// 1. Check environment variables
console.log("📋 Environment Variables:");
console.log("NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log("CLIENT_URL:", process.env.CLIENT_URL || "undefined");
console.log("SERVER_BASE_URL:", process.env.SERVER_BASE_URL || "undefined");
console.log("PORT:", process.env.PORT || "undefined");

// 2. Test URL generation logic
console.log("\n🔗 URL Generation Logic:");
const useAbsoluteUrl =
  process.env.SERVER_BASE_URL &&
  process.env.SERVER_BASE_URL !== process.env.CLIENT_URL;
console.log("useAbsoluteUrl:", useAbsoluteUrl);

const testFileName = "test_file.pdf";
let publicUrl;
if (useAbsoluteUrl) {
  publicUrl = `${process.env.SERVER_BASE_URL}/shipping/${testFileName}`;
} else {
  publicUrl = `/shipping/${testFileName}`;
}
console.log("Generated URL would be:", publicUrl);

// 3. Check PDF directory
console.log("\n📁 PDF Directory Check:");
const possiblePaths = [
  path.join(__dirname, "server/public/shipping"),
  path.join(__dirname, "public/shipping"),
  path.join(process.cwd(), "server/public/shipping"),
  path.join(process.cwd(), "public/shipping"),
  "/var/www/html/pazar/server/public/shipping",
  "/var/www/html/pazar/public/shipping",
];

possiblePaths.forEach((dirPath) => {
  if (fs.existsSync(dirPath)) {
    console.log(`✅ Directory exists: ${dirPath}`);
    try {
      const files = fs.readdirSync(dirPath);
      console.log(`   📄 Files count: ${files.length}`);
      if (files.length > 0) {
        console.log(`   📄 Recent files: ${files.slice(-3).join(", ")}`);
      }
    } catch (err) {
      console.log(`   ❌ Error reading directory: ${err.message}`);
    }
  } else {
    console.log(`❌ Directory not found: ${dirPath}`);
  }
});

// 4. Check if express.static is working
console.log("\n🌐 Express Static Serving Test:");
console.log("You should test these URLs in your browser:");
console.log(`- http://localhost:3000/shipping/ (if running locally)`);
console.log(`- https://yarukai.com/shipping/ (on VPS)`);
console.log(`- https://yarukai.com/api/shipping/ (if API serves static files)`);

// 5. Create a test PDF file
console.log("\n🧪 Creating Test PDF File:");
const testPdfPath = path.join(
  process.cwd(),
  "server/public/shipping/test-pdf-access.pdf"
);
const testPdfDir = path.dirname(testPdfPath);

try {
  // Ensure directory exists
  if (!fs.existsSync(testPdfDir)) {
    fs.mkdirSync(testPdfDir, { recursive: true });
    console.log(`✅ Created directory: ${testPdfDir}`);
  }

  // Create test PDF content (simple text file for testing)
  const testContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF for VPS) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

  fs.writeFileSync(testPdfPath, testContent);
  console.log(`✅ Created test PDF: ${testPdfPath}`);
  console.log(
    `🔗 Test this URL: https://yarukai.com/shipping/test-pdf-access.pdf`
  );
} catch (err) {
  console.log(`❌ Failed to create test PDF: ${err.message}`);
}

// 6. Check server.js static serving configuration
console.log("\n⚙️  Static Serving Configuration Check:");
const serverJsPath = path.join(process.cwd(), "server/server.js");
if (fs.existsSync(serverJsPath)) {
  try {
    const serverContent = fs.readFileSync(serverJsPath, "utf8");

    // Look for static serving configuration
    const staticMatches = serverContent.match(
      /app\.use\(['"`]\/shipping['"`][^;]*;/g
    );
    if (staticMatches) {
      console.log("✅ Found static serving configuration:");
      staticMatches.forEach((match) => console.log(`   ${match}`));
    } else {
      console.log("❌ No static serving configuration found for /shipping");
      console.log(
        '   You need to add: app.use("/shipping", express.static(path.join(__dirname, "public/shipping")));'
      );
    }
  } catch (err) {
    console.log(`❌ Error reading server.js: ${err.message}`);
  }
} else {
  console.log(`❌ server.js not found at: ${serverJsPath}`);
}

console.log("\n🎯 Next Steps:");
console.log("1. Run this script on your VPS");
console.log("2. Check if the test PDF URL works in browser");
console.log("3. Verify static serving is configured in server.js");
console.log("4. Check VPS nginx/apache configuration if using reverse proxy");
console.log("5. Ensure PDF files are being created in the right location");

console.log("\n✨ Diagnostics Complete!");
