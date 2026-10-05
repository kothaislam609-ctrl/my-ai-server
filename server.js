const http = require("http");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan VARCHAR(20) NOT NULL DEFAULT 'free',
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chats (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      chat_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chats_user_id
    ON chats(user_id);

    CREATE INDEX IF NOT EXISTS idx_messages_chat_id
    ON messages(chat_id);
  `);

  console.log("Database tables are ready.");
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Home
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "online",
      api: "My AI Chat API",
      database: "connected"
    }));
    return;
  }

  // Database test
  if (req.method === "GET" && req.url === "/database-test") {
    try {
      const result = await pool.query(
        "SELECT NOW() AS time"
      );

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        database: "connected",
        time: result.rows[0].time
      }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        database: "connection_failed",
        error: error.message
      }));
    }
    return;
  }

  // Browser chat test
  if (req.method === "GET" && req.url === "/chat") {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      reply: "🎉 Chat API ঠিকমতো কাজ করছে!"
    }));
    return;
  }

  // POST Chat
  if (req.method === "POST" && req.url === "/chat") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          reply: `তুমি বলেছো: ${data.message || "কোনো message পাওয়া যায়নি"}`
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

  // Not Found
  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: "Not Found"
  }));
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDatabase();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database initialization failed:", error);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

startServer();
