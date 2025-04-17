// app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const apiRoutes = require("./routes/apiRoutes");

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("Cham Cong Backend API Running!"));
app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(err.status || 500).send({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

app.use((req, res, next) => {
  res.status(404).send({ status: "error", message: "Not Found" });
});

module.exports = app;
