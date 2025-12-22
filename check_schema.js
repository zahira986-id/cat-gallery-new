const mysql = require('mysql');

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "nodejs"
});

con.connect(function (err) {
    if (err) {
        console.error("Connection failed:", err);
        return;
    }
    console.log("Connected!");

    con.query("DESCRIBE users", function (err, result) {
        if (err) {
            console.error("Error describing users table:", err.message);
        } else {
            console.log("Users Table Fields:", result.map(row => row.Field));
        }
        process.exit();
    });
});
