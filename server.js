<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EMORA AI</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, sans-serif;
      background: #08090d;
      color: #fff;
      height: 100vh;
      overflow: hidden;
    }

    button,
    textarea,
    input {
      font: inherit;
    }

    button {
      cursor: pointer;
    }

    /* LOGIN */

    #loginScreen {
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background:
        radial-gradient(circle at top, #20253b 0, #08090d 45%);
    }

    .loginBox {
      width: 100%;
      max-width: 400px;
      padding: 30px;
      border: 1px solid #272b3a;
      border-radius: 22px;
      background: rgba(17, 18, 25, .94);
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
    }

    .logo {
      text-align: center;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }

    .subtitle {
      text-align: center;
      color: #9297a8;
      margin-bottom: 28px;
    }

    .input {
      width: 100%;
      padding: 14px;
      margin-bottom: 12px;
      border: 1px solid #303445;
      border-radius: 12px;
      outline: none;
      background: #0d0f16;
      color: white;
    }

    .input:focus {
      border-color: #6573ff;
    }

    .primaryBtn {
      width: 100%;
      border: 0;
      border-radius: 12px;
      padding: 14px;
      background: #5865f2;
      color: white;
      font-weight: bold;
      margin-top: 5px;
    }

    .primaryBtn:disabled {
      opacity: .6;
    }

    #loginError {
      color: #ff7777;
      margin-top: 14px;
      text-align: center;
      min-height: 20px;
    }

    /* APP */

    #app {
      display: none;
      height: 100vh;
      position: relative;
    }

    .appLayout {
      height: 100%;
      display: flex;
    }

    /* SIDEBAR */

    .sidebar {
      width: 290px;
      background: #0d0f15;
      border-right: 1px solid #242733;
      display: flex;
      flex-direction: column;
      z-index: 20;
    }

    .sideTop {
      padding: 16px;
      border-bottom: 1px solid #242733;
    }

    .brandSmall {
      font-size: 19px;
      font-weight: 800;
      margin-bottom: 15px;
      letter-spacing: 1px;
    }

    .newChatBtn {
      width: 100%;
      padding: 12px;
      border: 1px solid #34394c;
      border-radius: 12px;
      background: #171a25;
      color: white;
      font-weight: bold;
    }

    .newChatBtn:hover {
      background: #202436;
    }

    .historyTitle {
      padding: 15px 16px 8px;
      color: #888fa3;
      font-size: 13px;
    }

    .history {
      flex: 1;
      overflow-y: auto;
      padding: 5px 10px;
    }

    .historyItem {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px;
      border-radius: 10px;
      margin-bottom: 4px;
      color: #ddd;
      background: transparent;
    }

    .historyItem:hover {
      background: #191c27;
    }

    .historyItem.active {
      background: #202436;
    }

    .historyText {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .deleteChat {
      border: 0;
      background: transparent;
      color: #777d8e;
      padding: 5px;
      font-size: 16px;
    }

    .deleteChat:hover {
      color: #ff6b6b;
    }

    .emptyHistory {
      color: #666d7d;
      text-align: center;
      padding: 25px 10px;
      font-size: 14px;
    }

    .profileArea {
      padding: 14px;
      border-top: 1px solid #242733;
    }

    .profileName {
      font-size: 14px;
      margin-bottom: 10px;
      color: #d9dce7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .logoutBtn {
      width: 100%;
      padding: 10px;
      border: 1px solid #343744;
      border-radius: 10px;
      background: transparent;
      color: #aaa;
    }

    .logoutBtn:hover {
      background: #1b1d26;
      color: white;
    }

    /* MAIN */

    .main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: #08090d;
    }

    .topbar {
      height: 60px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 16px;
      border-bottom: 1px solid #242733;
      background: rgba(8,9,13,.92);
    }

    .menuBtn {
      display: none;
      border: 0;
      background: transparent;
      color: white;
      font-size: 25px;
    }

    .topBrand {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .status {
      margin-left: auto;
      font-size: 12px;
      color: #8d95a8;
    }

    .statusDot {
      display: inline-block;
      width: 7px;
      height: 7px;
      background: #43d17a;
      border-radius: 50%;
      margin-right: 5px;
    }

    /* CHAT */

    .chatArea {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .welcome {
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      color: #8c93a5;
    }

    .welcomeBox {
      max-width: 500px;
    }

    .welcomeLogo {
      font-size: 38px;
      font-weight: 900;
      color: white;
      margin-bottom: 10px;
    }

    .welcomeText {
      line-height: 1.6;
    }

    .messageRow {
      display: flex;
      margin-bottom: 18px;
    }

    .messageRow.user {
      justify-content: flex-end;
    }

    .bubble {
      max-width: min(750px, 85%);
      padding: 12px 15px;
      border-radius: 17px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .user .bubble {
      background: #5865f2;
      color: white;
      border-bottom-right-radius: 5px;
    }

    .assistant .bubble {
      background: #171922;
      border: 1px solid #292d3a;
      color: #e8eaf0;
      border-bottom-left-radius: 5px;
    }

    .typing {
      display: none;
      color: #8c93a5;
      font-size: 14px;
      padding: 5px 2px 15px;
    }

    /* INPUT */

    .inputArea {
      padding: 12px 16px 16px;
      border-top: 1px solid #242733;
      background: #08090d;
    }

    .inputBox {
      max-width: 900px;
      margin: auto;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      background: #151720;
      border: 1px solid #2c3040;
      border-radius: 17px;
      padding: 8px;
    }

    #messageInput {
      flex: 1;
      min-height: 42px;
      max-height: 140px;
      resize: none;
      border: 0;
      outline: 0;
      background: transparent;
      color: white;
      padding: 10px;
      line-height: 1.4;
    }

    #messageInput::placeholder {
      color: #6e7484;
    }

    .sendBtn {
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 12px;
      background: #5865f2;
      color: white;
      font-size: 18px;
      font-weight: bold;
    }

    .sendBtn:disabled {
      opacity: .45;
    }

    /* MOBILE */

    .overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.6);
      z-index: 15;
    }

    @media (max-width: 700px) {
      .sidebar {
        position: fixed;
        left: -300px;
        top: 0;
        bottom: 0;
        transition: left .25s ease;
        box-shadow: 15px 0 40px rgba(0,0,0,.4);
      }

      .sidebar.open {
        left: 0;
      }

      .menuBtn {
        display: block;
      }

      .overlay.show {
        display: block;
      }

      .chatArea {
        padding: 15px 12px;
      }

      .bubble {
        max-width: 88%;
      }

      .inputArea {
        padding: 10px;
      }

      .status {
        display: none;
      }
    }
  </style>
</head>

<body>

  <!-- LOGIN -->
  <section id="loginScreen">
    <div class="loginBox">
      <div class="logo">EMORA AI</div>
      <div class="subtitle">Your intelligent AI assistant</div>

      <input
        id="email"
        class="input"
        type="email"
        placeholder="Email"
        autocomplete="email"
      />

      <input
        id="password"
        class="input"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
      />

      <button id="loginBtn" class="primaryBtn">
        Login
      </button>

      <div id="loginError"></div>
    </div>
  </section>


  <!-- APP -->
  <section id="app">

    <div class="overlay" id="overlay"></div>

    <div class="appLayout">

      <!-- SIDEBAR -->
      <aside class="sidebar" id="sidebar">

        <div class="sideTop">
          <div class="brandSmall">EMORA AI</div>

          <button class="newChatBtn" id="newChatBtn">
            ＋ New Chat
          </button>
        </div>

        <div class="historyTitle">
          Recent Chats
        </div>

        <div class="history" id="historyList">
          <div class="emptyHistory">
            No chats yet
          </div>
        </div>

        <div class="profileArea">
          <div class="profileName" id="profileName">
            User
          </div>

          <button class="logoutBtn" id="logoutBtn">
            Logout
          </button>
        </div>

      </aside>


      <!-- MAIN -->
      <main class="main">

        <header class="topbar">

          <button class="menuBtn" id="menuBtn">
            ☰
          </button>

          <div class="topBrand">
            EMORA AI
          </div>

          <div class="status">
            <span class="statusDot"></span>
            AI Online
          </div>

        </header>


        <!-- CHAT -->
        <div class="chatArea" id="chatArea">

          <div class="welcome" id="welcome">
            <div class="welcomeBox">
              <div class="welcomeLogo">
                EMORA AI
              </div>

              <div class="welcomeText">
                তোমার AI assistant।<br>
                যেকোনো প্রশ্ন লিখে শুরু করো।
              </div>
            </div>
          </div>

        </div>

        <div class="typing" id="typing">
          EMORA AI is thinking...
        </div>


        <!-- INPUT -->
        <div class="inputArea">

          <div class="inputBox">

            <textarea
              id="messageInput"
              placeholder="Message EMORA AI..."
              rows="1"
            ></textarea>

            <button
              class="sendBtn"
              id="sendBtn"
              title="Send"
            >
              ➤
            </button>

          </div>

        </div>

      </main>

    </div>
  </section>


<script>
  const API_URL = window.location.origin;
  const TOKEN_KEY = "my_ai_token";

  let token = localStorage.getItem(TOKEN_KEY);
  let currentUser = null;
  let currentChatId = null;
  let sending = false;

  const loginScreen = document.getElementById("loginScreen");
  const app = document.getElementById("app");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const loginError = document.getElementById("loginError");

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const menuBtn = document.getElementById("menuBtn");

  const historyList = document.getElementById("historyList");
  const newChatBtn = document.getElementById("newChatBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const profileName = document.getElementById("profileName");

  const chatArea = document.getElementById("chatArea");
  const welcome = document.getElementById("welcome");
  const typing = document.getElementById("typing");

  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");


  /* -------------------------
     API HELPER
  ------------------------- */

  async function api(path, options = {}) {

    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(API_URL + path, {
      ...options,
      headers
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      logoutLocal();
      throw new Error("Session expired");
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Something went wrong"
      );
    }

    return data;
  }


  /* -------------------------
     LOGIN
  ------------------------- */

  async function login() {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginError.textContent = "";

    if (!email || !password) {
      loginError.textContent =
        "Email and password required.";
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {

      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      });

      token = data.token;

      localStorage.setItem(
        TOKEN_KEY,
        token
      );

      await loadUser();

      showApp();

    } catch (error) {

      loginError.textContent =
        error.message || "Login failed.";

    } finally {

      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  }


  loginBtn.addEventListener("click", login);

  passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      login();
    }
  });


  /* -------------------------
     USER
  ------------------------- */

  async function loadUser() {

    const data = await api("/me");

    currentUser = data.user || data;

    profileName.textContent =
      currentUser.name ||
      currentUser.email ||
      "User";
  }


  /* -------------------------
     SHOW APP
  ------------------------- */

  function showApp() {

    loginScreen.style.display = "none";
    app.style.display = "block";

    loadChats();
    startNewChat();
  }


  /* -------------------------
     CHAT HISTORY
  ------------------------- */

  async function loadChats() {

    try {

      const data = await api("/chats");

      const chats =
        Array.isArray(data)
          ? data
          : (data.chats || []);

      renderHistory(chats);

    } catch (error) {

      console.error(
        "Could not load chats:",
        error
      );
    }
  }


  function renderHistory(chats) {

    historyList.innerHTML = "";

    if (!chats.length) {

      historyList.innerHTML = `
        <div class="emptyHistory">
          No chats yet
        </div>
      `;

      return;
    }

    chats.forEach(chat => {

      const item =
        document.createElement("div");

      item.className =
        "historyItem" +
        (
          Number(chat.id) === Number(currentChatId)
            ? " active"
            : ""
        );

      const text =
        document.createElement("div");

      text.className = "historyText";

      text.textContent =
        chat.title ||
        "New Chat";

      text.onclick = () => {
        openChat(chat.id);
      };

      const deleteBtn =
        document.createElement("button");

      deleteBtn.className =
        "deleteChat";

      deleteBtn.textContent = "🗑";

      deleteBtn.title = "Delete chat";

      deleteBtn.onclick = event => {

        event.stopPropagation();

        deleteChat(chat.id);
      };

      item.appendChild(text);
      item.appendChild(deleteBtn);

      item.onclick = () => {
        openChat(chat.id);
      };

      historyList.appendChild(item);
    });
  }


  /* -------------------------
     OPEN CHAT
  ------------------------- */

  async function openChat(chatId) {

    try {

      closeSidebar();

      const data =
        await api("/chats/" + encodeURIComponent(chatId));

      currentChatId =
        data.chat?.id ||
        chatId;

      const messages =
        data.messages ||
        data.chat?.messages ||
        [];

      renderMessages(messages);

      await loadChats();

      scrollBottom();

    } catch (error) {

      alert(
        error.message ||
        "Could not open chat."
      );
    }
  }


  /* -------------------------
     RENDER MESSAGES
  ------------------------- */

  function renderMessages(messages) {

    chatArea.innerHTML = "";

    if (!messages.length) {

      showWelcome();

      return;
    }

    messages.forEach(message => {

      addMessage(
        message.role,
        message.content
      );
    });
  }


  function showWelcome() {

    chatArea.innerHTML = `
      <div class="welcome" id="welcome">
        <div class="welcomeBox">
          <div class="welcomeLogo">
            EMORA AI
          </div>

          <div class="welcomeText">
            তোমার AI assistant।<br>
            যেকোনো প্রশ্ন লিখে শুরু করো।
          </div>
        </div>
      </div>
    `;
  }


  /* -------------------------
     NEW CHAT
  ------------------------- */

  function startNewChat() {

    currentChatId = null;

    showWelcome();

    messageInput.value = "";

    messageInput.focus();

    closeSidebar();

    loadChats();
  }


  newChatBtn.addEventListener(
    "click",
    startNewChat
  );


  /* -------------------------
     ADD MESSAGE
  ------------------------- */

  function addMessage(role, content) {

    if (welcome) {
      welcome.remove();
    }

    const row =
      document.createElement("div");

    row.className =
      "messageRow " +
      (
        role === "user"
          ? "user"
          : "assistant"
      );

    const bubble =
      document.createElement("div");

    bubble.className = "bubble";

    bubble.textContent =
      content || "";

    row.appendChild(bubble);

    chatArea.appendChild(row);

    scrollBottom();
  }


  /* -------------------------
     SEND MESSAGE
  ------------------------- */

  async function sendMessage() {

    if (sending) return;

    const message =
      messageInput.value.trim();

    if (!message) return;

    sending = true;

    sendBtn.disabled = true;
    messageInput.disabled = true;

    addMessage(
      "user",
      message
    );

    messageInput.value = "";
    autoResize();

    typing.style.display = "block";

    scrollBottom();

    try {

      const body = {
        message
      };

      if (currentChatId) {
        body.chatId =
          Number(currentChatId);
      }

      const data =
        await api("/chat", {
          method: "POST",
          body: JSON.stringify(body)
        });

      /*
        Backend creates a new chat
        automatically when chatId
        is not supplied.
      */

      if (data.chat?.id) {

        currentChatId =
          data.chat.id;

      } else if (data.chatId) {

        currentChatId =
          data.chatId;

      }

      const reply =
        data.reply ||
        data.response ||
        data.message ||
        "I couldn't generate a response.";

      typing.style.display = "none";

      addMessage(
        "assistant",
        reply
      );

      await loadChats();

    } catch (error) {

      typing.style.display = "none";

      addMessage(
        "assistant",
        "Sorry, something went wrong. Please try again."
      );

      console.error(error);

    } finally {

      sending = false;

      sendBtn.disabled = false;
      messageInput.disabled = false;

      messageInput.focus();

      scrollBottom();
    }
  }


  sendBtn.addEventListener(
    "click",
    sendMessage
  );


  /* -------------------------
     ENTER TO SEND
  ------------------------- */

  messageInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }
    }
  );


  /* -------------------------
     AUTO RESIZE
  ------------------------- */

  messageInput.addEventListener(
    "input",
    autoResize
  );

  function autoResize() {

    messageInput.style.height =
      "auto";

    messageInput.style.height =
      Math.min(
        messageInput.scrollHeight,
        140
      ) + "px";
  }


  /* -------------------------
     DELETE CHAT
  ------------------------- */

  async function deleteChat(chatId) {

    const confirmed =
      confirm(
        "Delete this chat?"
      );

    if (!confirmed) return;

    try {

      await api(
        "/chats/" +
        encodeURIComponent(chatId),
        {
          method: "DELETE"
        }
      );

      if (
        Number(chatId) ===
        Number(currentChatId)
      ) {

        startNewChat();

      } else {

        await loadChats();
      }

    } catch (error) {

      alert(
        error.message ||
        "Could not delete chat."
      );
    }
  }


  /* -------------------------
     LOGOUT
  ------------------------- */

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        if (token) {

          await api(
            "/logout",
            {
              method: "POST"
            }
          );
        }

      } catch {}

      logoutLocal();
    }
  );


  function logoutLocal() {

    localStorage.removeItem(
      TOKEN_KEY
    );

    token = null;
    currentUser = null;
    currentChatId = null;

    app.style.display = "none";
    loginScreen.style.display = "flex";

    emailInput.value = "";
    passwordInput.value = "";
    loginError.textContent = "";
  }


  /* -------------------------
     MOBILE SIDEBAR
  ------------------------- */

  menuBtn.addEventListener(
    "click",
    () => {

      sidebar.classList.add(
        "open"
      );

      overlay.classList.add(
        "show"
      );
    }
  );


  overlay.addEventListener(
    "click",
    closeSidebar
  );


  function closeSidebar() {

    sidebar.classList.remove(
      "open"
    );

    overlay.classList.remove(
      "show"
    );
  }


  /* -------------------------
     SCROLL
  ------------------------- */

  function scrollBottom() {

    requestAnimationFrame(() => {

      chatArea.scrollTop =
        chatArea.scrollHeight;

    });
  }


  /* -------------------------
     AUTO LOGIN
  ------------------------- */

  async function checkSession() {

    if (!token) {

      loginScreen.style.display =
        "flex";

      app.style.display =
        "none";

      return;
    }

    try {

      await loadUser();

      showApp();

    } catch {

      logoutLocal();
    }
  }


  checkSession();

</script>

</body>
</html>
