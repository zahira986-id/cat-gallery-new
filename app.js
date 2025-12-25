require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const cookieParser = require("cookie-parser");

const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_cat_key_123";
const SESSION_SECRET = process.env.SESSION_SECRET || "super_secret_session_key_456";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Fallback for root if static fails (explicitly serve index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// PostgreSQL Connection Pool


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.stack);
    } else {
        console.log('✅ Successfully connected to PostgreSQL database');
        release();
    }
});

// Session Middleware
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'sessions'
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 86400000, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// --- AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req, res, next) {
    const token = req.cookies.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token" });
        }
        req.user = user;
        next();
    });
}

// --- AUTHENTICATION ROUTES ---

// Register
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Check if user exists
        const userCheck = await pool.query(
            "SELECT * FROM users WHERE email = $1 OR username = $2",
            [email, username]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Insert user
        await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
            [username, email, hash]
        );

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Error registering user" });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = result.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );
        console.log("Login successful:", token);

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000 // 1 hour
        });

        // Store user data in session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;
        req.session.isAuthenticated = true;

        // Save session and update user_id
        req.session.save(async (err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ error: "Session error" });
            }

            try {
                // Update user_id in sessions table
                await pool.query(
                    "UPDATE sessions SET user_id = $1 WHERE sid = $2",
                    [user.id, req.sessionID]
                );

                res.json({
                    message: "Login successful",
                    user: { id: user.id, username: user.username, email: user.email }
                });
            } catch (updateErr) {
                console.error("Error linking session to user:", updateErr);
                res.json({
                    message: "Login successful",
                    user: { id: user.id, username: user.username, email: user.email }
                });
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Error logging in" });
    }
});


// Cleanup Sessions
app.post("/cleanup-sessions", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
        console.log(`Cleaned up ${result.rowCount} sessions for user ${userId}`);
        res.json({ message: "Sessions cleaned up successfully" });
    } catch (error) {
        console.error("Cleanup error:", error);
        res.status(500).json({ error: "Error cleaning up sessions" });
    }
});

// Logout
app.post("/logout", (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: "Failed to logout" });
            }
            res.clearCookie('connect.sid');
            res.clearCookie('token');
            res.json({ message: "Logout successful" });
        });
    } else {
        res.json({ message: "No active session" });
    }
});

// Get session status
app.get("/session", (req, res) => {
    if (req.session && req.session.isAuthenticated) {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                email: req.session.email
            }
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// --- CAT ROUTES ---

// Get Cats
app.get("/cats", async (req, res) => {
    try {
        let query = "SELECT * FROM cats";
        let params = [];
        let paramIndex = 1;

        if (req.query.search) {
            query += ` WHERE name ILIKE $${paramIndex}`;
            params.push(`%${req.query.search}%`);
            paramIndex++;
        }

        if (req.query.tag) {
            if (query.includes('WHERE')) {
                query += ` AND tag = $${paramIndex}`;
            } else {
                query += ` WHERE tag = $${paramIndex}`;
            }
            params.push(req.query.tag);
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching cats:", error);
        res.status(500).json({ error: "DB query error" });
    }
});

// Get Cat by ID
app.get("/cats/:id", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM cats WHERE id = $1", [req.params.id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching cat:", error);
        res.status(500).json({ error: "DB query error" });
    }
});

// Delete Cat by Id
app.delete("/cats/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM cats WHERE id = $1", [req.params.id]);
        res.json({ message: `Record Num :${req.params.id} deleted successfully` });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Query error" });
    }
});

// Add cat
app.post("/cats", async (req, res) => {
    const { name, tag, descreption, img } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO cats (name, tag, descreption, img) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, tag, descreption, img]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Insert error:", error);
        res.status(500).json({ error: "Query error" });
    }
});

// Update cat
app.put("/cats/:id", async (req, res) => {
    const { name, tag, descreption, img } = req.body;
    try {
        const result = await pool.query(
            "UPDATE cats SET name = $1, tag = $2, descreption = $3, img = $4 WHERE id = $5 RETURNING *",
            [name, tag, descreption, img, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Query error" });
    }
});

// --- ADOPTION ROUTES ---

// Adopt a cat
app.post("/adopt/:catId", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const catId = req.params.catId;

    try {
        // Check if cat exists
        const catCheck = await pool.query("SELECT * FROM cats WHERE id = $1", [catId]);
        if (catCheck.rows.length === 0) {
            return res.status(404).json({ error: "Cat not found" });
        }

        // Insert adoption
        await pool.query(
            "INSERT INTO adoptions (user_id, cat_id) VALUES ($1, $2)",
            [userId, catId]
        );

        res.json({ message: "Cat adopted successfully!" });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: "You have already adopted this cat" });
        }
        console.error("Adoption error:", error);
        res.status(500).json({ error: "Error adopting cat" });
    }
});

// Remove adoption
app.delete("/adopt/:catId", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const catId = req.params.catId;

    try {
        const result = await pool.query(
            "DELETE FROM adoptions WHERE user_id = $1 AND cat_id = $2",
            [userId, catId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Adoption not found" });
        }

        res.json({ message: "Adoption removed successfully!" });
    } catch (error) {
        console.error("Delete adoption error:", error);
        res.status(500).json({ error: "Error removing adoption" });
    }
});

// Get all adopted cats for current user
app.get("/adoptions", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `SELECT cats.* FROM adoptions
             JOIN cats ON adoptions.cat_id = cats.id
             WHERE adoptions.user_id = $1
             ORDER BY adoptions.adopted_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Fetch adoptions error:", error);
        res.status(500).json({ error: "Query error" });
    }
});

// Get adoption count for current user
app.get("/adoptions/count", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            "SELECT COUNT(*) as count FROM adoptions WHERE user_id = $1",
            [userId]
        );

        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error("Count error:", error);
        res.status(500).json({ error: "Query error" });
    }
});

// Get all unique tags
app.get("/tags", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT DISTINCT tag FROM cats WHERE tag IS NOT NULL AND tag != '' ORDER BY tag"
        );

        const tags = result.rows.map(row => row.tag);
        res.json(tags);
    } catch (error) {
        console.error("Tags fetch error:", error);
        res.status(500).json({ error: "DB query error" });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});