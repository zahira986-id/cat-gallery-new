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

console.log("Setting up adoptions table...");

pool.getConnection((err, connection) => {
    if (err) {
        console.error("DB connection error:", err);
        process.exit(1);
    }

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS adoptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            cat_id INT NOT NULL,
            adopted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_adoption (user_id, cat_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    connection.query(createTableQuery, (qErr) => {
        connection.release();
        if (qErr) {
            console.error("Error creating table:", qErr);
            process.exit(1);
        }
        console.log("✓ Adoptions table created successfully!");
        process.exit(0);
    });
});
