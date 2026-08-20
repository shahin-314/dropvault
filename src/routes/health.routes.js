const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "DropVault API",
    message: "Server is running",
  });
});

module.exports = router;