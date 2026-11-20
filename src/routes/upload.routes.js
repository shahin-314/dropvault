const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const supabase = require("../config/supabase");
const pool = require("../db");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

const MAX_STORAGE = 1024 * 1024 * 1024; // 1 GB

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 4 * 1024 * 1024
    }
});

router.post(
    "/upload",
    authenticateToken,
    upload.single("file"),
    async (req, res) => {
        let storagePath;

        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "No file uploaded"
                });
            }

            const userId = req.user.userId;

            // Step 1: Calculate SHA-256 hash of file contents.
            const fileHash = crypto
                .createHash("sha256")
                .update(req.file.buffer)
                .digest("hex");

            // Step 2: Check whether this user already has this file.
            const duplicate = await pool.query(
                `SELECT id, original_name
                 FROM files
                 WHERE user_id = $1 AND file_hash = $2
                 LIMIT 1`,
                [userId, fileHash]
            );

            if (duplicate.rows.length > 0) {
                return res.status(409).json({
                    error: "Duplicate file",
                    message: "You have already uploaded this file.",
                    existingFile: duplicate.rows[0]
                });
            }

            // Step 3: Calculate the user's current storage usage.
            const usageResult = await pool.query(
                `SELECT COALESCE(SUM(file_size), 0) AS total
                 FROM files
                 WHERE user_id = $1`,
                [userId]
            );

            const currentUsage = Number(usageResult.rows[0].total);

            // Step 4: Check the 1 GB storage limit.
            if (currentUsage + req.file.size > MAX_STORAGE) {
                return res.status(413).json({
                    error: "Storage limit exceeded",
                    message: "Your 1 GB storage limit has been reached."
                });
            }

            // Step 5: Create a unique storage path.
            const fileExtension = path.extname(req.file.originalname);

            storagePath =
                `${userId}/${crypto.randomUUID()}${fileExtension}`;

            // Step 6: Upload file to Supabase Storage.
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

            // Step 7: Save file details and SHA-256 hash in PostgreSQL.
            const result = await pool.query(
                `INSERT INTO files
                 (user_id, original_name, storage_path, mime_type, file_size, file_hash)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    userId,
                    req.file.originalname,
                    storagePath,
                    req.file.mimetype,
                    req.file.size,
                    fileHash
                ]
            );

            return res.status(201).json({
                message: "File uploaded successfully",
                file: result.rows[0]
            });

        } catch (error) {
            console.error("UPLOAD ERROR:", error);

            // Remove the Storage object if the database operation failed.
            if (storagePath) {
                await supabase.storage
                    .from("files")
                    .remove([storagePath])
                    .catch(cleanupError => {
                        console.error("STORAGE CLEANUP ERROR:", cleanupError);
                    });
            }

            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    error: "File too large",
                    message: "Maximum upload size is 4 MB."
                });
            }

            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);

module.exports = router;
