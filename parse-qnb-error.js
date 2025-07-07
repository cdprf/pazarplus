#!/usr/bin/env node

const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.qnb-test
function loadEnvFile() {
  const envFile = path.join(__dirname, ".env.qnb-test");
  const envConfig = {};

  try {
    const content = fs.readFileSync(envFile, "utf8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        envConfig[key] = value;
      }
    }
  } catch (error) {
    console.log("Could not load .env.qnb-test file:", error.message);
  }

  return envConfig;
}

// Parse error response from command line argument or stdin
function getErrorResponse() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args.join(" ");
  }

  // Default example if no input provided
  return `<?xml version='1.0' encoding='UTF-8'?><S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body><S:Fault xmlns:ns4="http://www.w3.org/2003/05/soap-envelope"><faultcode>S:Server</faultcode><faultstring>MessageCode:username.pwd.mismatch</faultstring></S:Fault></S:Body></S:Envelope>`;
}

async function parseQNBError(errorResponse = null) {
  console.log("\n🔍 QNB Finans Error Analysis");
  console.log("=".repeat(50));

  // Get error response from parameter, command line, or default
  const responseXml = errorResponse || getErrorResponse();

  // Load environment configuration
  const env = loadEnvFile();

  try {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(responseXml);

    const fault = result["S:Envelope"]["S:Body"]["S:Fault"];

    console.log("\n📋 SOAP Fault Details:");
    console.log("─".repeat(30));
    console.log(`🔸 Fault Code: ${fault.faultcode}`);
    console.log(`🔸 Fault String: ${fault.faultstring}`);

    console.log("\n🔍 Error Analysis:");
    console.log("─".repeat(30));

    if (fault.faultstring.includes("username.pwd.mismatch")) {
      console.log("❌ Authentication Error: Username/Password Mismatch");
      console.log("\n💡 Possible Causes:");
      console.log("   • Incorrect username format");
      console.log("   • Incorrect password");
      console.log("   • Missing session-based authentication");
      console.log("   • Using WS-Security instead of session login");

      console.log("\n🔧 Suggested Solutions:");
      console.log("   1. Verify username format (should be: VKN.portaltest)");
      console.log("   2. Check password encoding (special characters)");
      console.log("   3. Implement session-based login like C# example:");
      console.log("      - First: userService.wsLogin()");
      console.log("      - Then: use session cookies for connectorService");
      console.log("   4. Remove WS-Security from operation requests");
    }

    console.log("\n📊 Current Configuration:");
    console.log("─".repeat(30));
    console.log(`🔸 Environment: ${env.QNB_FINANS_ENVIRONMENT || "Not set"}`);
    console.log(`🔸 VKN: ${env.QNB_FINANS_VKN || "Not set"}`);
    console.log(`🔸 Username: ${env.QNB_FINANS_USERNAME || "Not set"}`);
    console.log(
      `🔸 Password: ${
        env.QNB_FINANS_PASSWORD
          ? "[HIDDEN - Length: " + env.QNB_FINANS_PASSWORD.length + "]"
          : "Not set"
      }`
    );

    // Analyze username format
    if (env.QNB_FINANS_USERNAME) {
      console.log("\n🔍 Username Analysis:");
      console.log("─".repeat(30));
      if (env.QNB_FINANS_USERNAME.includes(".portaltest")) {
        console.log("✅ Username format looks correct (includes .portaltest)");
      } else {
        console.log("❌ Username might be missing .portaltest suffix");
        console.log(`   Current: ${env.QNB_FINANS_USERNAME}`);
        console.log(`   Expected: ${env.QNB_FINANS_VKN}.portaltest`);
      }
    }

    console.log("\n🎯 Next Steps:");
    console.log("─".repeat(30));
    console.log("1. Fix username format if needed");
    console.log("2. Implement proper session-based authentication");
    console.log("3. Follow QNB Finans C# documentation pattern");
    console.log("4. Test with both e-Arşiv and e-Fatura accounts");
  } catch (error) {
    console.error("Error parsing SOAP fault:", error.message);
  }
}

parseQNBError();
