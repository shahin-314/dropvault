const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");
const authenticateToken = require("../middleware/auth.middleware");
const sendPasswordResetEmail = require("../services/email.service");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email and password are required"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "Email already registered"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            await client.query(
                "INSERT INTO login_history (user_id) VALUES ($1)",
                [user.id]
            );

            await client.query(
                "UPDATE users SET last_login_at = NOW() WHERE id = $1",
                [user.id]
            );

            await client.query("COMMIT");

        } catch (databaseError) {
            await client.query("ROLLBACK");
            throw databaseError;

        } finally {
            client.release();
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PROFILE
router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, created_at, last_login_at
             FROM users WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error("PROFILE ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== "string") {
            return res.status(400).json({ error: "Valid email is required" });
        }

        const genericMessage = {
            message: "If an account exists for this email, a password reset email has been sent."
        };

        const result = await pool.query(
            "SELECT id, email FROM users WHERE email = $1",
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.json(genericMessage);
        }

        const user = result.rows[0];

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256")
            .update(token)
            .digest("hex");

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            await client.query(
                `UPDATE password_reset_tokens
                 SET used_at = NOW()
                 WHERE user_id = $1 AND used_at IS NULL`,
                [user.id]
            );

            await client.query(
                `INSERT INTO password_reset_tokens
                 (user_id, token_hash, expires_at)
                 VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
                [user.id, tokenHash]
            );

            await client.query("COMMIT");

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }

        await sendPasswordResetEmail(user.email, token);

        res.json(genericMessage);

    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        res.status(500).json({ error: "Unable to process password reset request" });
    }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({
            error: "Token and newPassword are required"
        });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({
            error: "Password must be at least 8 characters long"
        });
    }

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const tokenHash = crypto.createHash("sha256")
        .update(token)
        .digest("hex");

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT id, user_id
             FROM password_reset_tokens
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()
             FOR UPDATE`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                error: "Invalid or expired reset token"
            });
        }

        const resetRecord = result.rows[0];
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await client.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [passwordHash, resetRecord.user_id]
        );

        await client.query(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
            [resetRecord.id]
        );

        await client.query(
            `UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE user_id = $1 AND used_at IS NULL`,
            [resetRecord.user_id]
        );

        await client.query("COMMIT");

        res.json({ message: "Password reset successful. Please login with your new password." });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("RESET PASSWORD ERROR:", error);
        res.status(500).json({ error: "Unable to reset password" });

    } finally {
        client.release();
    }
});

module.exports = router;
