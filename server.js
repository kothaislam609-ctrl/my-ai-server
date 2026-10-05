const http = require("http");
const crypto = require("crypto");
const { promisify } = require("util");
const { Pool } = require("pg");

const scrypt = promisify(crypto.scrypt);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// -----------------------------
// Database Setup
// -----------------------------
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

// -----------------------------
// Password Hash
// -----------------------------
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const derivedKey = await scrypt(
    password,
    salt,
    64
  );

  return `${salt}:${derivedKey.toString("hex")}`;
}

// -----------------------------
// Read Request Body
// -----------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      // Prevent extremely large request bodies
      if (body.length > 10000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

// -----------------------------
// Server
// -----------------------------
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

  // ---------------------------
  // Home
  // ---------------------------
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "online",
      api: "My AI Chat API",
      database: "connected"
    }));
    return;
  }

  // ---------------------------
  // Database Test
  // ---------------------------
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
        database: "connection_failed"
      }));
    }

    return;
  }

  // ---------------------------
  // Register
  // ---------------------------
  if (req.method === "POST" && req.url === "/register") {
    try {
      const data = await readBody(req);

      const name = String(data.name || "").trim();
      const email = String(data.email || "")
        .trim()
        .toLowerCase();
      const password = String(data.password || "");

      // Name validation
      if (name.length < 2 || name.length > 100) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: "Name must be between 2 and 100 characters."
        }));
        return;
      }

      // Email validation
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email) || email.length > 255) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: "Please enter a valid email."
        }));
        return;
      }

      // Password validation
      if (password.length < 8 || password.length > 128) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: "Password must be 8 to 128 characters."
        }));
        return;
      }

      // Check existing user
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1 LIMIT 1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        res.writeHead(409);
        res.end(JSON.stringify({
          success: false,
          error: "An account with this email already exists."
        }));
        return;
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const result = await pool.query(
        `
        INSERT INTO users
        (name, email, password_hash, plan, role)
        VALUES ($1, $2, $3, 'free', 'user')
        RETURNING id, name, email, plan, role, created_at
        `,
        [name, email, passwordHash]
      );

      const user = result.rows[0];

      res.writeHead(201);
      res.end(JSON.stringify({
        success: true,
        message: "Account created successfully.",
        user: user
      }));

    } catch (error) {
      console.error("Register error:", error);

      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        error: "Unable to create account."
      }));
    }

    return;
  }

  // ---------------------------
  // Browser Chat Test
  // ---------------------------
  if (req.method === "GET" && req.url === "/chat") {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      reply: "🎉 Chat API ঠিকমতো কাজ করছে!"
    }));
    return;
  }

  // ---------------------------
  // POST Chat Test
  // ---------------------------
  if (req.method === "POST" && req.url === "/chat") {
    try {
      const data = await readBody(req);

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        reply:
          `তুমি বলেছো: ${
            data.message || "কোনো message পাওয়া যায়নি"
          }`
      }));

    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({
        success: false,
        error: "Invalid JSON"
      }));
    }

    return;
  }

  // ---------------------------
  // Not Found
  // ---------------------------
  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: "Not Found"
  }));
});

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDatabase();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error(
      "Database initialization failed:",
      error
    );

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

startServer();
