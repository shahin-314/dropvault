const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "DropVault API",
    message: "Server is running",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`DropVault API running on port ${PORT}`);
});