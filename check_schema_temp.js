const mysql = require("mysql");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "nodejs"
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    connection.query("DESCRIBE sessions", (qErr, rows) => {
        connection.release();
        if (qErr) {
            console.error("Error describing table:", qErr);
        } else {
            // Just print field names
            console.log(JSON.stringify(rows.map(r => r.Field)));
        }
        process.exit();
    });
});
