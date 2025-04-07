const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const WebSocket = require("ws");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

let fingerprintData = [];
let fingerprints = { count: 0, ids: [] };

// Cấu hình Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: "google-api.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "15RC5NUB2O1z-gUeiVhclmM9rLbtzKwXN4R9syj3a1Z8";

async function appendToSheet(sheetName, data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:C`,
    valueInputOption: "RAW",
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [data],
    },
  });
}

// Create WebSocket server
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");

  // Send current fingerprint data to newly connected client
  ws.send(JSON.stringify({
    type: "fingerprint_data",
    data: fingerprints
  }));

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case "fingerprint_data":
          fingerprints = { count: data.count, ids: data.ids };
          console.log("Fingerprint data updated:", fingerprints);
          break;

        case "scan":
          const scanData = {
            fingerID: String(data.id),
            timestamp: new Date().toISOString()
          };
          fingerprintData.push(scanData);
          console.log("Fingerprint scanned:", scanData);
          break;

        case "add_status":
          if (data.status === "success") {
            const fingerID = String(data.id);
            const name = fingerprintData.find((fp) => fp.fingerID === fingerID)?.name || "Unknown";
            const msv = "MSV" + fingerID;
            try {
              await appendToSheet("Data", [fingerID, name, msv]);
              console.log(`Added to Sheet: ${fingerID}, ${name}, ${msv}`);
            } catch (error) {
              console.error("Error appending to Sheet:", error);
            }
          }
          break;

        case "delete_status":
          console.log(`Delete ${data.status} for ID: ${data.id}`);
          break;
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

// HTTP endpoints for frontend compatibility
app.post("/api/data", (req, res) => {
  const { id, name, action } = req.body;
  if (!id) {
    return res.status(400).json({ status: "error", message: "Missing id" });
  }

  if (action === "add") {
    const data = { fingerID: String(id), name: name || "Unknown", timestamp: new Date().toISOString() };
    fingerprintData.push(data);
    
    // Send add command to ESP8266 via WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`add:${id}`);
      }
    });
    
    return res.json({ status: "success", data });
  }

  const data = { fingerID: String(id), timestamp: new Date().toISOString() };
  fingerprintData.push(data);
  res.json({ status: "success", data });
});

app.get("/api/data", (req, res) => {
  res.json({ status: "success", data: fingerprintData });
});

app.get("/api/fingerprints", (req, res) => {
  res.json({ status: "success", data: fingerprints });
});

app.post("/api/delete-fingerprint", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ status: "error", message: "Missing id" });
  }
  
  // Send delete command to ESP8266 via WebSocket
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(`delete:${id}`);
    }
  });
  
  console.log("Delete request for ID:", id);
  res.json({ status: "success", message: `Delete request for ID ${id} sent` });
});