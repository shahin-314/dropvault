const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email and password are required"
            });
        }

        // 2. Check if email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "Email already registered"
            });
        }

        // 3. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 4. Save user in database
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        // 5. Send response
        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check required fields
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        // 2. Find user
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

        // 3. Compare password with stored hash
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        // 4. Create JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // 5. Send token
        res.json({
            message: "Login successful",
            token
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});


router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, created_at FROM users WHERE id = $1",
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.json({
            user: result.rows[0]
        });

    } catch (error) {
        console.error("PROFILE ERROR:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});


module.exports = router;