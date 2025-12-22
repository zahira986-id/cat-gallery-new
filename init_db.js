const mysql = require('mysql');

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "nodejs" // Connecting directly to the DB from app.js config
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");

    // Create Users Table
    const usersTable = `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    )`;

    con.query(usersTable, function (err, result) {
        if (err) throw err;
        console.log("Users table created or already exists");
    });

    // Create Cats Table (preserving 'descreption' typo from code)
    //const catsTable = `CREATE TABLE IF NOT EXISTS cats (
    //    id INT AUTO_INCREMENT PRIMARY KEY,
    //    name VARCHAR(255) NOT NULL,
    //    tag VARCHAR(255),
    //    descreption TEXT, 
    //    img TEXT
    //)`;

    con.query(catsTable, function (err, result) {
        if (err) throw err;
        console.log("Cats table created or already exists");
        process.exit();
    });
});
