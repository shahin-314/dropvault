require("dotenv").config({ override: true });

const express = require("express");
const swaggerUi = require("swagger-ui-express");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const uploadRoutes = require("./routes/upload.routes");
const fileRoutes = require("./routes/file.routes");

const swaggerDocument = require("./docs/swagger");

const {
    authLimiter,
    uploadLimiter
} = require("./middleware/rate-limit.middleware");

const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

// API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/files/upload", uploadLimiter);
app.use("/api/files", uploadRoutes);
app.use("/api/files", fileRoutes);

if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`DropVault API running on port ${PORT}`);
    });
}

module.exports = app;
