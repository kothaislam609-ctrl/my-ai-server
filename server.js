const http = require("http");

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Test endpoint
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "online",
      api: "My AI Chat API",
      message: "Server is ready!"
    }));
    return;
  }

  // Chat API
  if (req.method === "POST" && req.url === "/chat") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const message = data.message || "";

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          reply: `তুমি বলেছ: ${message}`
        }));

      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: "Invalid JSON"
        }));
      }
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
