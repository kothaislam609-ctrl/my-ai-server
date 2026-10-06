const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { Pool } = require("pg");

const PORT = process.env.PORT || 10000;
const scrypt = promisify(crypto.scrypt);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

/* =========================================================
   DATABASE
========================================================= */

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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chats (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      chat_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chats_user_id
    ON chats(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id
    ON messages(chat_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
    ON sessions(token_hash);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions(user_id);
  `);

  console.log("Database initialized.");
}

/* =========================================================
   HELPERS
========================================================= */

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(data));
}

function readBody(req, maxSize = 12000000) {
  return new Promise((resolve, reject) => {
    let body = "";
    let finished = false;

    req.on("data", chunk => {
      if (finished) return;

      body += chunk.toString();

      if (body.length > maxSize) {
        finished = true;
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (finished) return;

      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });

    req.on("error", error => {
      if (!finished) reject(error);
    });
  });
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createRandomToken() {
  return crypto.randomBytes(48).toString("hex");
}

/* =========================================================
   PASSWORD
========================================================= */

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const derivedKey = await scrypt(
    password,
    salt,
    64
  );

  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split(":");

    if (parts.length !== 2) return false;

    const salt = parts[0];

    const storedKey = Buffer.from(
      parts[1],
      "hex"
    );

    const derivedKey = await scrypt(
      password,
      salt,
      64
    );

    if (storedKey.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      storedKey,
      derivedKey
    );
  } catch {
    return false;
  }
}

/* =========================================================
   SESSION
========================================================= */

async function createSession(userId) {
  const token = createRandomToken();
  const tokenHash = hashToken(token);

  const expiresAt = new Date(
    Date.now() +
    7 * 24 * 60 * 60 * 1000
  );

  await pool.query(
    `
      INSERT INTO sessions
      (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [
      userId,
      tokenHash,
      expiresAt
    ]
  );

  return token;
}

function getBearerToken(req) {
  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

async function getCurrentUser(req) {
  const token = getBearerToken(req);

  if (!token) return null;

  const tokenHash = hashToken(token);

  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.plan,
        u.role,
        u.created_at
      FROM sessions s
      JOIN users u
        ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows.length
    ? result.rows[0]
    : null;
}

/* =========================================================
   OPENAI CHAT
========================================================= */

async function askAI(messages) {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const model =
    process.env.OPENAI_MODEL ||
    "gpt-6-luna";

  const input = messages.map(message => ({
    role:
      message.role === "assistant"
        ? "assistant"
        : "user",
    content: message.content
  }));

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        "Authorization":
          `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,

        instructions:
          "You are EMORA AI, a helpful and intelligent AI assistant. " +
          "Answer naturally and clearly. " +
          "If the user writes Bengali, reply in Bengali. " +
          "If the user writes English, reply in English. " +
          "Do not repeatedly introduce yourself. " +
          "Do not say your name unnecessarily.",

        input
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "OpenAI API error:",
      data
    );

    throw new Error(
      data?.error?.message ||
      "OpenAI request failed."
    );
  }

  if (data.output_text) {
    return data.output_text.trim();
  }

  let text = "";

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item.content)) continue;

      for (const content of item.content) {
        if (
          content.type === "output_text" &&
          content.text
        ) {
          text += content.text;
        }
      }
    }
  }

  text = text.trim();

  if (!text) {
    throw new Error(
      "AI returned an empty response."
    );
  }

  return text;
}

/* =========================================================
   IMAGE ANALYSIS
========================================================= */

async function analyzeImage(req, res) {
  const user = await getCurrentUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error: "Unauthorized."
    });
    return;
  }

  const body = await readBody(
    req,
    12000000
  );

  const image =
    String(body.image || "").trim();

  const prompt =
    String(
      body.prompt ||
      "Describe and analyze this image clearly."
    ).trim();

  if (!image) {
    sendJSON(res, 400, {
      error: "Image is required."
    });
    return;
  }

  if (!image.startsWith("data:image/")) {
    sendJSON(res, 400, {
      error: "Invalid image format."
    });
    return;
  }

  if (image.length > 10000000) {
    sendJSON(res, 400, {
      error: "Image is too large."
    });
    return;
  }

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJSON(res, 500, {
      error:
        "OPENAI_API_KEY is not configured."
    });
    return;
  }

  try {
    const model =
      process.env.OPENAI_MODEL ||
      "gpt-6-luna";

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
          "Authorization":
            `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model,

          instructions:
            "You are EMORA AI. Analyze the provided image accurately. " +
            "Answer in Bengali if the user's prompt is Bengali, otherwise English.",

          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt
                },
                {
                  type: "input_image",
                  image_url: image,
                  detail: "auto"
                }
              ]
            }
          ]
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Image analysis error:",
        data
      );

      sendJSON(res, 500, {
        error:
          data?.error?.message ||
          "Image analysis failed."
      });

      return;
    }

    let reply =
      data.output_text || "";

    if (!reply && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) continue;

        for (const content of item.content) {
          if (
            content.type === "output_text" &&
            content.text
          ) {
            reply += content.text;
          }
        }
      }
    }

    reply = reply.trim();

    if (!reply) {
      throw new Error(
        "AI returned an empty image analysis."
      );
    }

    sendJSON(res, 200, {
      success: true,
      reply
    });

  } catch (error) {
    console.error(
      "Image analysis exception:",
      error
    );

    sendJSON(res, 500, {
      error:
        error.message ||
        "Image analysis failed."
    });
  }
}

/* =========================================================
   AI IMAGE GENERATION
========================================================= */

async function generateImage(req, res) {
  const user = await getCurrentUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error: "Unauthorized."
    });
    return;
  }

  const body =
    await readBody(req, 20000);

  const prompt =
    String(body.prompt || "").trim();

  if (!prompt) {
    sendJSON(res, 400, {
      error:
        "Image prompt is required."
    });
    return;
  }

  if (prompt.length > 4000) {
    sendJSON(res, 400, {
      error:
        "Image prompt is too long."
    });
    return;
  }

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJSON(res, 500, {
      error:
        "OPENAI_API_KEY is not configured."
    });
    return;
  }

  try {
    const response =
      await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            "Authorization":
              `Bearer ${apiKey}`
          },

          body: JSON.stringify({
            model:
              process.env.OPENAI_IMAGE_MODEL ||
              "gpt-image-2",

            prompt,

            size:
              body.size ||
              "1024x1024",

            quality:
              body.quality ||
              "auto"
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Image API error:",
        data
      );

      sendJSON(res, 500, {
        error:
          data?.error?.message ||
          "Image generation failed."
      });

      return;
    }

    if (
      !Array.isArray(data.data) ||
      !data.data.length
    ) {
      sendJSON(res, 500, {
        error:
          "Image API returned no image."
      });
      return;
    }

    const image =
      data.data[0];

    if (image.b64_json) {
      sendJSON(res, 200, {
        success: true,
        prompt,

        image: {
          type: "base64",
          data: image.b64_json
        }
      });

      return;
    }

    if (image.url) {
      sendJSON(res, 200, {
        success: true,
        prompt,

        image: {
          type: "url",
          url: image.url
        }
      });

      return;
    }

    sendJSON(res, 500, {
      error:
        "No usable image data returned."
    });

  } catch (error) {
    console.error(
      "Image generation error:",
      error
    );

    sendJSON(res, 500, {
      error:
        error.message ||
        "Image generation failed."
    });
  }
}

/* =========================================================
   STATIC WEBSITE
========================================================= */

function sendWebsite(res) {
  const filePath =
    path.join(
      __dirname,
      "public",
      "index.html"
    );

  if (!fs.existsSync(filePath)) {
    sendJSON(res, 404, {
      error:
        "public/index.html not found."
    });
    return;
  }

  fs.readFile(
    filePath,
    (error, data) => {
      if (error) {
        sendJSON(res, 500, {
          error:
            "Could not load website."
        });
        return;
      }

      res.writeHead(200, {
        "Content-Type":
          "text/html; charset=utf-8",
        "Cache-Control":
          "no-store"
      });

      res.end(data);
    }
  );
}

/* =========================================================
   REGISTER
========================================================= */

async function register(req, res) {
  const body = await readBody(req);

  const name =
    String(body.name || "").trim();

  const email =
    String(body.email || "")
      .trim()
      .toLowerCase();

  const password =
    String(body.password || "");

  if (!name || !email || !password) {
    sendJSON(res, 400, {
      error:
        "Name, email and password are required."
    });
    return;
  }

  if (password.length < 6) {
    sendJSON(res, 400, {
      error:
        "Password must be at least 6 characters."
    });
    return;
  }

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

  if (existing.rows.length) {
    sendJSON(res, 409, {
      error:
        "An account with this email already exists."
    });
    return;
  }

  const passwordHash =
    await hashPassword(password);

  const result =
    await pool.query(
      `
        INSERT INTO users
        (name, email, password_hash)
        VALUES ($1, $2, $3)
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

  const token =
    await createSession(user.id);

  sendJSON(res, 201, {
    message:
      "Registration successful.",
    token,
    user
  });
}

/* =========================================================
   LOGIN
========================================================= */

async function login(req, res) {
  const body = await readBody(req);

  const email =
    String(body.email || "")
      .trim()
      .toLowerCase();

  const password =
    String(body.password || "");

  if (!email || !password) {
    sendJSON(res, 400, {
      error:
        "Email and password are required."
    });
    return;
  }

  const result =
    await pool.query(
      `
        SELECT *
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

  if (!result.rows.length) {
    sendJSON(res, 401, {
      error:
        "Invalid email or password."
    });
    return;
  }

  const userRow =
    result.rows[0];

  const valid =
    await verifyPassword(
      password,
      userRow.password_hash
    );

  if (!valid) {
    sendJSON(res, 401, {
      error:
        "Invalid email or password."
    });
    return;
  }

  const token =
    await createSession(userRow.id);

  sendJSON(res, 200, {
    message:
      "Login successful.",

    token,

    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      plan: userRow.plan,
      role: userRow.role,
      created_at:
        userRow.created_at
    }
  });
}

/* =========================================================
   ME
========================================================= */

async function me(req, res) {
  const user =
    await getCurrentUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error:
        "Unauthorized."
    });
    return;
  }

  sendJSON(res, 200, {
    user
  });
}

/* =========================================================
   LOGOUT
========================================================= */

async function logout(req, res) {
  const token =
    getBearerToken(req);

  if (token) {
    await pool.query(
      `
        DELETE FROM sessions
        WHERE token_hash = $1
      `,
      [hashToken(token)]
    );
  }

  sendJSON(res, 200, {
    message:
      "Logged out."
  });
}

/* =========================================================
   CHAT
========================================================= */

async function chat(req, res) {
  const user =
    await getCurrentUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error:
        "Unauthorized."
    });
    return;
  }

  const body =
    await readBody(req);

  const message =
    String(body.message || "").trim();

  let chatId =
    body.chatId
      ? Number(body.chatId)
      : null;

  if (!message) {
    sendJSON(res, 400, {
      error:
        "Message is required."
    });
    return;
  }

  if (message.length > 5000) {
    sendJSON(res, 400, {
      error:
        "Message is too long."
    });
    return;
  }

  if (!chatId) {
    const title =
      message.length > 80
        ? message.slice(0, 80) + "..."
        : message;

    const chatResult =
      await pool.query(
        `
          INSERT INTO chats
          (user_id, title)
          VALUES ($1, $2)
          RETURNING id, title, created_at
        `,
        [
          user.id,
          title
        ]
      );

    chatId =
      chatResult.rows[0].id;
  }

  const chatResult =
    await pool.query(
      `
        SELECT
          id,
          title,
          created_at
        FROM chats
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [
        chatId,
        user.id
      ]
    );

  if (!chatResult.rows.length) {
    sendJSON(res, 404, {
      error:
        "Chat not found."
    });
    return;
  }

  const userMessageResult =
    await pool.query(
      `
        INSERT INTO messages
        (chat_id, role, content)
        VALUES ($1, 'user', $2)
        RETURNING id
      `,
      [
        chatId,
        message
      ]
    );

  const userMessageId =
    userMessageResult.rows[0].id;

  const historyResult =
    await pool.query(
      `
        SELECT
          role,
          content
        FROM messages
        WHERE chat_id = $1
        ORDER BY id ASC
      `,
      [chatId]
    );

  const history =
    historyResult.rows.slice(-40);

  let reply;

  try {
    reply =
      await askAI(history);
  } catch (error) {
    console.error(
      "AI error:",
      error
    );

    await pool.query(
      `
        DELETE FROM messages
        WHERE id = $1
      `,
      [userMessageId]
    );

    sendJSON(res, 500, {
      error:
        error.message ||
        "AI request failed."
    });

    return;
  }

  await pool.query(
    `
      INSERT INTO messages
      (chat_id, role, content)
      VALUES ($1, 'assistant', $2)
    `,
    [
      chatId,
      reply
    ]
  );

  sendJSON(res, 200, {
    reply,
    chat:
      chatResult.rows[0],
    chatId,

    message: {
      role: "assistant",
      content: reply
    }
  });
}

/* =========================================================
   CHATS
========================================================= */

async function getChats(req, res) {
  const user =
    await getCurrentUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error:
        "Unauthorized."
    });
    return;
  }

  const result =
    await pool.query(
      `
        SELECT
          id,
          title,
          created_at
        FROM chats
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [user.id]
    );

  sendJSON(res, 200, {
    chats:
      result.rows
  });
}

async function getChat(req, res, chatId) {
  const user =
    await getCurrentUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error:
        "Unauthorized."
    });
    return;
  }

  const chatResult =
    await pool.query(
      `
        SELECT
          id,
          title,
          created_at
        FROM chats
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [
        chatId,
        user.id
      ]
    );

  if (!chatResult.rows.length) {
    sendJSON(res, 404, {
      error:
        "Chat not found."
    });
    return;
  }

  const messagesResult =
    await pool.query(
      `
        SELECT
          id,
          role,
          content,
          created_at
        FROM messages
        WHERE chat_id = $1
        ORDER BY id ASC
      `,
      [chatId]
    );

  sendJSON(res, 200, {
    chat:
      chatResult.rows[0],
    messages:
      messagesResult.rows
  });
}

async function deleteChat(req, res, chatId) {
  const user =
    await getCurrentUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error:
        "Unauthorized."
    });
    return;
  }

  const result =
    await pool.query(
      `
        DELETE FROM chats
        WHERE id = $1
          AND user_id = $2
        RETURNING id
      `,
      [
        chatId,
        user.id
      ]
    );

  if (!result.rows.length) {
    sendJSON(res, 404, {
      error:
        "Chat not found."
    });
    return;
  }

  sendJSON(res, 200, {
    message:
      "Chat deleted successfully."
  });
}

/* =========================================================
   DATABASE TEST
========================================================= */

async function databaseTest(req, res) {
  const result =
    await pool.query(
      "SELECT NOW() AS now"
    );

  sendJSON(res, 200, {
    success: true,
    message:
      "Database connection is working.",
    time:
      result.rows[0].now
  });
}

/* =========================================================
   SERVER
========================================================= */

const server =
  http.createServer(
    async (req, res) => {
      try {

        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin":
              "*",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization",
            "Access-Control-Allow-Methods":
              "GET, POST, DELETE, OPTIONS"
          });

          res.end();
          return;
        }

        const url =
          new URL(
            req.url,
            `http://${req.headers.host}`
          );

        const pathname =
          url.pathname;

        if (
          req.method === "GET" &&
          pathname === "/"
        ) {
          sendWebsite(res);
          return;
        }

        if (
          req.method === "POST" &&
          pathname === "/register"
        ) {
          await register(req, res);
          return;
        }

        if (
          req.method === "POST" &&
          pathname === "/login"
        ) {
          await login(req, res);
          return;
        }

        if (
          req.method === "GET" &&
          pathname === "/me"
        ) {
          await me(req, res);
          return;
        }

        if (
          req.method === "POST" &&
          pathname === "/logout"
        ) {
          await logout(req, res);
          return;
        }

        if (
          req.method === "GET" &&
          pathname === "/database-test"
        ) {
          await databaseTest(req, res);
          return;
        }

        if (
          req.method === "POST" &&
          pathname === "/generate-image"
        ) {
          await generateImage(req, res);
          return;
        }

        if (
          req.method === "POST" &&
          pathname === "/analyze-image"
        ) {
          await analyzeImage(req, res);
          return;
        }

        if (
          req.method === "GET" &&
          pathname === "/chats"
        ) {
          await getChats(req, res);
          return;
        }

        const chatMatch =
          pathname.match(
            /^\/chats\/(\d+)$/
          );

        if (chatMatch) {
          const chatId =
            Number(chatMatch[1]);

          if (req.method === "GET") {
            await getChat(
              req,
              res,
              chatId
            );
            return;
          }

          if (req.method === "DELETE") {
            await deleteChat(
              req,
              res,
              chatId
            );
            return;
          }
        }

        if (
          req.method === "POST" &&
          pathname === "/chat"
        ) {
          await chat(req, res);
          return;
        }

        if (
          req.method === "GET" &&
          pathname === "/chat"
        ) {
          sendJSON(res, 200, {
            message:
              "EMORA AI Real Chat API is ready."
          });
          return;
        }

        sendJSON(res, 404, {
          error:
            "Route not found."
        });

      } catch (error) {
        console.error(
          "SERVER ERROR:",
          error
        );

        sendJSON(res, 500, {
          error:
            error.message ||
            "Internal server error."
        });
      }
    }
  );

/* =========================================================
   START
========================================================= */

async function start() {
  try {
    await initDatabase();

    server.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `EMORA AI Server running on port ${PORT}`
        );
      }
    );

  } catch (error) {
    console.error(
      "Startup failed:",
      error
    );

    process.exit(1);
  }
}

start();
