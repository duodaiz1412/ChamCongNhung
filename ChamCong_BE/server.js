const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");

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
let deleteRequest = 0;
let addRequest = 0;

// Cấu hình Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: "google-api.json", // Tải file JSON từ Google Cloud Console
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "15RC5NUB2O1z-gUeiVhclmM9rLbtzKwXN4R9syj3a1Z8"; // Thay bằng ID của Google Sheet

async function appendToSheet(sheetName, data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:C`, // Ghi vào cột A, B, C (fingerID, name, msv)
    valueInputOption: "RAW",
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [data],
    },
  });
}

app.post("/api/data", (req, res) => {
  const { id, name, action } = req.body; // Thêm name từ frontend
  if (!id) {
    return res.status(400).json({ status: "error", message: "Missing id" });
  }

  if (action === "add") {
    addRequest = parseInt(id);
    const data = { fingerID: String(id), name: name || "Unknown", timestamp: new Date().toISOString() };
    fingerprintData.push(data);
    return res.json({ status: "success", data });
  }

  const data = { fingerID: String(id), timestamp: new Date().toISOString() };
  fingerprintData.push(data);
  res.json({ status: "success", data });
});

app.get("/api/data", (req, res) => {
  res.json({ status: "success", data: fingerprintData });
});

app.post("/api/fingerprints", async (req, res) => {
  const { count, ids, message } = req.body;
  if (count === undefined || !ids) {
    return res.status(400).json({ status: "error", message: "Missing count or ids" });
  }
  fingerprints = { count, ids };
  console.log("Fingerprint data updated:", fingerprints);

  if (message && message.includes("Thêm vân tay")) {
    const fingerID = ids[0]; // Lấy fingerID từ mảng ids
    const name = fingerprintData.find((fp) => fp.fingerID === String(fingerID))?.name || "Unknown";
    const msv = "MSV" + fingerID; // Ví dụ mã sinh viên, bạn có thể thay đổi logic
    try {
      await appendToSheet("Data", [fingerID, name, msv]); // Ghi vào Sheet2
      console.log(`Added to Sheet2: ${fingerID}, ${name}, ${msv}`);
    } catch (error) {
      console.error("Error appending to Sheet2:", error);
    }
  }

  res.json({ status: "success", data: fingerprints });
});

app.get("/api/fingerprints", (req, res) => {
  res.json({ status: "success", data: fingerprints });
});

app.post("/api/delete-fingerprint", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ status: "error", message: "Missing id" });
  }
  deleteRequest = parseInt(id);
  console.log("Delete request for ID:", id);
  res.json({ status: "success", message: `Delete request for ID ${id} queued` });
});

app.get("/api/delete-fingerprint", (req, res) => {
  if (deleteRequest > 0) {
    const id = deleteRequest;
    deleteRequest = 0;
    res.send(String(id));
  } else {
    res.send("");
  }
});

app.post("/api/add-fingerprint", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ status: "error", message: "Missing id" });
  }
  addRequest = parseInt(id);
  console.log("Add request for ID:", id);
  res.json({ status: "success", message: `Add request for ID ${id} queued` });
});

app.get("/api/add-fingerprint", (req, res) => {
  if (addRequest > 0) {
    const id = addRequest;
    addRequest = 0;
    res.send(String(id));
  } else {
    res.send("");
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});