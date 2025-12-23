const mysql = require("mysql");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "nodejs",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log("Setting up sessions table...");

pool.getConnection((err, connection) => {
    if (err) {
        console.error("DB connection error:", err);
        process.exit(1);
    }

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS sessions (
            session_id VARCHAR(128) NOT NULL PRIMARY KEY,
            user_id INT DEFAULT NULL,
            expires BIGINT(20) UNSIGNED NOT NULL,
            data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_expires (expires),
            INDEX idx_user_id (user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    connection.query(createTableQuery, (qErr) => {
        connection.release();
        if (qErr) {
            console.error("Error creating sessions table:", qErr);
            process.exit(1);
        }
        console.log("✓ Sessions table created successfully!");
        console.log("  - session_id: unique identifier for each session");
        console.log("  - user_id: links session to user (optional, for logged-in users)");
        console.log("  - expires: timestamp when session expires");
        console.log("  - data: session data storage");
        console.log("  - created_at/updated_at: timestamp tracking");
        process.exit(0);
    });
});
