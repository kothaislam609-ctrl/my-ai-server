const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { Pool } = require("pg");

const scrypt = promisify(crypto.scrypt);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// ========================================
// DATABASE SETUP
// ========================================

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

  console.log("Database tables ready.");
}


// ========================================
// PASSWORD HASH
// ========================================

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const key = await scrypt(
    password,
    salt,
    64
  );

  return `${salt}:${key.toString("hex")}`;
}


// ========================================
// READ JSON BODY
// ========================================

function readBody(req) {
  return new Promise((resolve, reject) => {

    let body = "";

    req.on("data", chunk => {

      body += chunk;

      if (body.length > 10000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }

    });

    req.on("end", () => {

      try {

        const data = JSON.parse(body || "{}");

        resolve(data);

      } catch {

        reject(new Error("Invalid JSON"));

      }

    });

    req.on("error", reject);

  });
}


// ========================================
// SEND JSON
// ========================================

function sendJSON(res, statusCode, data) {

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });

  res.end(JSON.stringify(data));

}


// ========================================
// SEND WEBSITE
// ========================================

function sendWebsite(res) {

  const filePath = path.join(
    __dirname,
    "public",
    "index.html"
  );

  fs.readFile(
    filePath,
    "utf8",
    (error, html) => {

      if (error) {

        console.error(
          "Website file error:",
          error
        );

        sendJSON(res, 500, {
          success: false,
          error: "Website file not found."
        });

        return;
      }

      res.writeHead(200, {
        "Content-Type":
          "text/html; charset=utf-8",
        "Cache-Control":
          "no-cache"
      });

      res.end(html);

    }
  );

}


// ========================================
// SERVER
// ========================================

const server = http.createServer(
  async (req, res) => {

    // ====================================
    // CORS
    // ====================================

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );


    // ====================================
    // OPTIONS
    // ====================================

    if (req.method === "OPTIONS") {

      res.writeHead(204);
      res.end();

      return;
    }


    // ====================================
    // WEBSITE
    // ====================================

    if (
      req.method === "GET" &&
      (
        req.url === "/" ||
        req.url === "/index.html"
      )
    ) {

      sendWebsite(res);

      return;
    }


    // ====================================
    // DATABASE TEST
    // ====================================

    if (
      req.method === "GET" &&
      req.url === "/database-test"
    ) {

      try {

        const result =
          await pool.query(
            "SELECT NOW() AS time"
          );

        sendJSON(res, 200, {
          success: true,
          database: "connected",
          time: result.rows[0].time
        });

      } catch (error) {

        console.error(
          "Database test error:",
          error
        );

        sendJSON(res, 500, {
          success: false,
          database: "connection_failed"
        });

      }

      return;
    }


    // ====================================
    // REGISTER
    // ====================================

    if (
      req.method === "POST" &&
      req.url === "/register"
    ) {

      try {

        const data =
          await readBody(req);


        const name =
          String(
            data.name || ""
          ).trim();


        const email =
          String(
            data.email || ""
          )
          .trim()
          .toLowerCase();


        const password =
          String(
            data.password || ""
          );


        // NAME CHECK

        if (
          name.length < 2 ||
          name.length > 100
        ) {

          sendJSON(res, 400, {
            success: false,
            error: "Invalid name."
          });

          return;
        }


        // EMAIL CHECK

        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
          !emailRegex.test(email) ||
          email.length > 255
        ) {

          sendJSON(res, 400, {
            success: false,
            error: "Invalid email."
          });

          return;
        }


        // PASSWORD CHECK

        if (
          password.length < 8 ||
          password.length > 128
        ) {

          sendJSON(res, 400, {
            success: false,
            error:
              "Password must be 8 to 128 characters."
          });

          return;
        }


        // CHECK EXISTING USER

        const existing =
          await pool.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
            LIMIT 1
            `,
            [email]
          );


        if (existing.rows.length > 0) {

          sendJSON(res, 409, {
            success: false,
            error:
              "An account with this email already exists."
          });

          return;
        }


        // HASH PASSWORD

        const passwordHash =
          await hashPassword(password);


        // CREATE USER

        const result =
          await pool.query(
            `
            INSERT INTO users
            (
              name,
              email,
              password_hash,
              plan,
              role
            )
            VALUES
            (
              $1,
              $2,
              $3,
              'free',
              'user'
            )
            RETURNING
              id,
              name,
              email,
              plan,
              role,
              created_at
            `,
            [
              name,
              email,
              passwordHash
            ]
          );


        const user =
          result.rows[0];


        sendJSON(res, 201, {
          success: true,
          message:
            "Account created successfully.",
          user: user
        });


      } catch (error) {

        console.error(
          "Register error:",
          error
        );


        sendJSON(res, 500, {
          success: false,
          error:
            "Unable to create account."
        });

      }

      return;
    }


    // ====================================
    // CHAT GET TEST
    // ====================================

    if (
      req.method === "GET" &&
      req.url === "/chat"
    ) {

      sendJSON(res, 200, {
        success: true,
        reply:
          "🎉 Chat API ঠিকমতো কাজ করছে!"
      });

      return;
    }


    // ====================================
    // CHAT POST TEST
    // ====================================

    if (
      req.method === "POST" &&
      req.url === "/chat"
    ) {

      try {

        const data =
          await readBody(req);


        const message =
          String(
            data.message || ""
          ).trim();


        if (!message) {

          sendJSON(res, 400, {
            success: false,
            error:
              "Message is required."
          });

          return;
        }


        sendJSON(res, 200, {
          success: true,
          reply:
            `তুমি বলেছো: ${message}`
        });


      } catch (error) {

        sendJSON(res, 400, {
          success: false,
          error: "Invalid JSON"
        });

      }

      return;
    }


    // ====================================
    // 404
    // ====================================

    sendJSON(res, 404, {
      success: false,
      error: "Not Found"
    });

  }
);


// ========================================
// START SERVER
// ========================================

const PORT =
  process.env.PORT || 3000;


async function startServer() {

  try {

    await initDatabase();

    console.log(
      "Database initialization completed."
    );

  } catch (error) {

    console.error(
      "Database initialization failed:",
      error
    );

  }


  server.listen(
    PORT,
    () => {

      console.log(
        `My AI Server running on port ${PORT}`
      );

    }
  );

}


startServer();
