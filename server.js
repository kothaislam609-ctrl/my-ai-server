const http = require("http");
const { Client } = require("pg");

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "online",
      api: "My AI Chat API",
      database: "ready to test"
    }));
    return;
  }

  if (req.method === "GET" && req.url === "/database-test") {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    client.connect()
      .then(() => client.query("SELECT NOW() AS time"))
      .then(result => {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          database: "connected",
          time: result.rows[0].time
        }));
        return client.end();
      })
      .catch(error => {
        res.writeHead(500);
        res.end(JSON.stringify({
          success: false,
          database: "connection_failed",
          error: error.message
        }));
      });

    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: "Not Found"
  }));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
