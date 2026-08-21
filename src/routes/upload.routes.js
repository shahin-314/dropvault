const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const supabase = require("../config/supabase");
const pool = require("../db");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

router.post(
    "/upload",
    authenticateToken,
    upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "No file uploaded"
                });
            }

            const fileExtension = path.extname(req.file.originalname);

            const storagePath =
                `${req.user.userId}/${crypto.randomUUID()}${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from("files")
                .upload(storagePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                console.error("STORAGE ERROR:", uploadError);

                return res.status(500).json({
                    error: "File upload failed"
                });
            }

            const result = await pool.query(
                `INSERT INTO files
                (user_id, original_name, storage_path, mime_type, file_size)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [
                    req.user.userId,
                    req.file.originalname,
                    storagePath,
                    req.file.mimetype,
                    req.file.size
                ]
            );

            res.status(201).json({
                message: "File uploaded successfully",
                file: result.rows[0]
            });

        } catch (error) {
            console.error("UPLOAD ERROR:", error);

            res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);

module.exports = router;