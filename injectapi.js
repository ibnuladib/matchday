const fs = require("fs");
const path = require("path");
require("dotenv").config();

const API_TOKEN = process.env.API_TOKEN;

const inputFile = path.join(__dirname, "popup.js");
const outputFile = path.join(__dirname, "dist", "popup.js");

if (!API_TOKEN) {
  console.error("API_TOKEN not found in .env");
  process.exit(1);
}

fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });

let jsContent = fs.readFileSync(inputFile, "utf-8");
jsContent = jsContent.replace(/__API_TOKEN__/g, API_TOKEN);

fs.writeFileSync(outputFile, jsContent, "utf-8");

console.log("✅ API token injected successfully.");
