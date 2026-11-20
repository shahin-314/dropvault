
const express = require("express");
const multer = require("multer");
const supabase = require("../config/supabase");
const pool = require("../db");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage()
});


// ===============================
// UPLOAD FILE
// ===============================
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

            const userId = req.user.userId;
            const fileId = require("crypto").randomUUID();

            const storagePath =
                `${userId}/${fileId}-${req.file.originalname}`;

            const { data, error } = await supabase.storage
                .from("files")
                .upload(storagePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error("STORAGE UPLOAD ERROR:", error);

                return res.status(500).json({
                    error: "File upload failed"
                });
            }

            const result = await pool.query(
                `INSERT INTO files
                (id, user_id, original_name, storage_path, mime_type, file_size)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    fileId,
                    userId,
                    req.file.originalname,
                    data.path,
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


// ===============================
// GET MY FILES
// ===============================
router.get(
    "/my-files",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;

            const result = await pool.query(
                `SELECT id, original_name, mime_type, file_size, created_at
                 FROM files
                 WHERE user_id = $1
                 AND deleted_at IS NULL
                 ORDER BY created_at DESC`,
                [userId]
            );

            res.json({
                files: result.rows
            });

        } catch (error) {
            console.error("LIST FILES ERROR:", error);

            res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


// ===============================
// MOVE FILE TO TRASH
// ===============================
router.delete(
    "/:fileId",
    authenticateToken,
    async (req, res) => {
        try {
            const { fileId } = req.params;
            const userId = req.user.userId;

            const result = await pool.query(
                `UPDATE files
                 SET deleted_at = NOW()
                 WHERE id = $1
                 AND user_id = $2
                 AND deleted_at IS NULL
                 RETURNING id, original_name, deleted_at`,
                [fileId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "File not found or already in Trash"
                });
            }

            res.json({
                message: "File moved to Trash successfully",
                file: result.rows[0]
            });

        } catch (error) {
            console.error("MOVE TO TRASH ERROR:", error);

            res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


// ===============================
// GET TRASH FILES
// ===============================
router.get(
    "/trash",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;

            const result = await pool.query(
                `SELECT id, original_name, mime_type, file_size,
                        created_at, deleted_at
                 FROM files
                 WHERE user_id = $1
                 AND deleted_at IS NOT NULL
                 ORDER BY deleted_at DESC`,
                [userId]
            );

            res.json({
                files: result.rows
            });

        } catch (error) {
            console.error("TRASH LIST ERROR:", error);

            res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


// ===============================
// RESTORE FILE FROM TRASH
// ===============================
router.patch(
    "/:fileId/restore",
    authenticateToken,
    async (req, res) => {
        try {
            const { fileId } = req.params;
            const userId = req.user.userId;

            const result = await pool.query(
                `UPDATE files
                 SET deleted_at = NULL
                 WHERE id = $1
                 AND user_id = $2
                 AND deleted_at IS NOT NULL
                 RETURNING id, original_name, deleted_at`,
                [fileId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "File not found in Trash"
                });
            }

            res.json({
                message: "File restored successfully",
                file: result.rows[0]
            });

        } catch (error) {
            console.error("RESTORE FILE ERROR:", error);

            res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


// ===============================
// PERMANENTLY DELETE FILE
// ===============================
router.delete(
    "/:fileId/permanent",
    authenticateToken,
    async (req, res) => {
        try {
            const { fileId } = req.params;
            const userId = req.user.userId;

            const result = await pool.query(
                `SELECT id, storage_path
                 FROM files
                 WHERE id = $1
                 AND user_id = $2
                 AND deleted_at IS NOT NULL`,
                [fileId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "File not found in Trash"
                });
            }

            const file = result.rows[0];

            const { error: storageError } = await supabase.storage
                .from("files")
                .remove([file.storage_path]);

            if (storageError) {
                console.error("STORAGE DELETE ERROR:", storageError);

                return res.status(500).json({
                    error: "Failed to delete file from storage"
                });
            }

            await pool.query(
                `DELETE FROM files
                 WHERE id = $1
                 AND user_id = $2
                 AND deleted_at IS NOT NULL`,
                [fileId, userId]
            );

            res.json({
                message: "File permanently deleted"
            });

        } catch (error) {
            console.error("PERMANENT DELETE ERROR:", error);

            res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


// ===============================
// DOWNLOAD FILE
// ===============================
router.get(
    "/download/:fileId",
    authenticateToken,
    async (req, res) => {
        try {
            const { fileId } = req.params;
            const userId = req.user.userId;

            const result = await pool.query(
                `SELECT *
                 FROM files
                 WHERE id = $1
                 AND user_id = $2
                 AND deleted_at IS NULL`,
                [fileId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "File not found"
                });
            }

            const file = result.rows[0];

            const { data, error } = await supabase.storage
                .from("files")
                .download(file.storage_path);

            if (error) {
                console.error("DOWNLOAD ERROR:", error);

                return res.status(500).json({
                    error: "File download failed"
                });
            }

            res.setHeader(
                "Content-Type",
                file.mime_type || "application/octet-stream"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${file.original_name}"`
            );

            const buffer = Buffer.from(
                await data.arrayBuffer()
            );

            res.send(buffer);

        } catch (error) {
            console.error("DOWNLOAD ERROR:", error);

            res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


module.exports = router;
