require("dotenv").config({ override: true });
const express = require("express");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const uploadRoutes = require("./routes/upload.routes");
const fileRoutes = require("./routes/file.routes");


const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/files", uploadRoutes);
app.use("/api/files", fileRoutes);

app.listen(PORT, () => {
    console.log(`DropVault API running on port ${PORT}`);
});