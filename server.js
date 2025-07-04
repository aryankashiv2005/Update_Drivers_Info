const http = require('http');
const fs = require('fs');
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'blackbox'
});

connection.connect(err => {
  if (err) throw err;
  console.log("✅ Connected to MySQL");
});

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    if (req.url === '/' || req.url === '/gui.html') {
      fs.readFile('gui.html', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end("❌ Error loading HTML");
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        }
      });

    } else if (req.url.startsWith('/drivers')) {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const name = urlObj.searchParams.get('name');
      const dateRange = urlObj.searchParams.get('dateRange');

      let query = "SELECT * FROM drivers WHERE 1";
      const params = [];

      if (name && name !== 'all') {
        query += " AND driver_name = ?";
        params.push(name);
      }

      if (dateRange) {
        const [start, end] = dateRange.split(" to ");
        query += " AND created_at BETWEEN ? AND ?";
        params.push(start, end || start);
      }

      connection.query(query, params, (err, results) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      });

    } else if (req.url === '/driver-names') {
      connection.query("SELECT DISTINCT driver_name FROM drivers", (err, results) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      });

    } else {
      res.writeHead(404);
      res.end("❌ Not Found");
    }

  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const data = JSON.parse(body);

      if (req.url === '/submit') {
        const { bbid, vehicleNo, driverName, mobileNo, licenseNo } = data;
        const sql = "INSERT INTO drivers (bbid, vehicle_no, driver_name, mobile_no, license_no, created_at) VALUES (?, ?, ?, ?, ?, CURDATE())";
        connection.query(sql, [bbid, vehicleNo, driverName, mobileNo, licenseNo], (err) => {
          if (err) {
            res.writeHead(500);
            res.end("❌ Insert failed");
          } else {
            res.writeHead(200);
            res.end("✅ Inserted");
          }
        });

      } else if (req.url === '/edit') {
        const { bbid, vehicleNo, driverName, mobileNo, licenseNo } = data;
        const sql = "UPDATE drivers SET vehicle_no=?, driver_name=?, mobile_no=?, license_no=? WHERE bbid=?";
        connection.query(sql, [vehicleNo, driverName, mobileNo, licenseNo, bbid], (err, result) => {
          if (err) {
            res.writeHead(500);
            res.end("❌ Update failed");
          } else {
            res.writeHead(200);
            res.end("✅ Updated");
          }
        });

      } else if (req.url === '/delete') {
        const { bbid } = data;
        const sql = "DELETE FROM drivers WHERE bbid=?";
        connection.query(sql, [bbid], (err) => {
          if (err) {
            console.error("❌ Delete Error:", err); // 🔍 This line shows exact error
            res.writeHead(500);
            res.end("❌ Delete failed");
          } else {
            res.writeHead(200);
            res.end("✅ Deleted");
          }
        });

      } else {
        res.writeHead(404);
        res.end("❌ Unknown POST route");
      }
    });

  } else {
    res.writeHead(405);
    res.end("❌ Method not allowed");
  }
});

server.listen(8080, () => {
  console.log("🚀 Server running at http://localhost:8080/");
});
