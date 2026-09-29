const SERVER_URL = "https://slimens-server.onrender.com";

const socket = io(SERVER_URL, { 
  autoConnect: false,
  transports: ["websocket", "polling"]
});

let myNickname = "";
let currentRoom = "Общий чат";

const STICKER_LIST = [
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp"
];

// Автозаполнение из выпадающего списка
function autoFillAccount() {
  const select = document.getElementById("quickSelect");
  if (!select.value) return;
  const [nick, pass] = select.value.split(":");
  document.getElementById("nicknameInput").value = nick;
  document.getElementById("passwordInput").value = pass;
}

window.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("stickerGrid");
  if (grid) {
    grid.innerHTML = "";
    STICKER_LIST.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.className = "sticker-option";
      img.onclick = () => sendSticker(url);
      grid.appendChild(img);
    });
  }
});

function login() {
  const nickname = document.getElementById("nicknameInput").value.trim().toLowerCase();
  const password = document.getElementById("passwordInput").value.trim();
  const errorDiv = document.getElementById("authError");

  if (!nickname || !password) {
    errorDiv.innerText = "Заполните логин и пароль!";
    return;
  }

  errorDiv.innerText = "Подключение...";

  if (!socket.connected) socket.connect();

  socket.emit("auth_user", { nickname, password }, (res) => {
    if (res && res.success) {
      myNickname = nickname;
      document.getElementById("displayNickname").innerText = `@${myNickname}`;
      document.getElementById("authModal").classList.add("hidden");
      document.getElementById("appContainer").classList.remove("hidden");

      renderRoomsList(res.rooms);
      switchRoom("Общий чат");

      if (res.history && Array.isArray(res.history)) {
        document.getElementById("messagesContainer").innerHTML = "";
        res.history.forEach(msg => appendMessage(msg));
      }
    } else {
      errorDiv.innerText = res ? res.message : "Ошибка входа";
    }
  });
}

socket.on("global_online_count", (count) => {
  const el = document.getElementById("globalOnlineCount");
  if (el) el.innerText = count;
});

socket.on("room_created", (roomName) => {
  addRoomToSidebar(roomName);
});

socket.on("receive_message", (data) => appendMessage(data));

socket.on("update_users_list", (users) => {
  const usersList = document.getElementById("usersList");
  document.getElementById("onlineCount").innerText = users.length;
  usersList.innerHTML = "";
  users.forEach(user => {
    const li = document.createElement("li");
    li.className = "user-item";
    li.innerText = `@${user}`;
    usersList.appendChild(li);
  });
});

function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("send_message", {
    room: currentRoom,
    user: myNickname,
    text: text,
    type: "text",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  messageInput.value = "";
  hideStickerPicker();
}

function sendSticker(stickerUrl) {
  socket.emit("send_message", {
    room: currentRoom,
    user: myNickname,
    stickerUrl: stickerUrl,
    type: "sticker",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  hideStickerPicker();
}

async function sendFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${SERVER_URL}/upload`, { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      socket.emit("send_message", {
        room: currentRoom,
        user: myNickname,
        fileUrl: data.url,
        fileName: data.name,
        type: "file",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      fileInput.value = "";
    }
  } catch (err) {
    alert("Ошибка загрузки файла.");
  }
}

function appendMessage(data) {
  const container = document.getElementById("messagesContainer");
  const msgDiv = document.createElement("div");
  const isMe = data.user === myNickname;
  
  if (data.type === "sticker") {
    msgDiv.className = `message sticker-message ${isMe ? "my-message" : ""}`;
    msgDiv.innerHTML = `<img src="${data.stickerUrl}" class="sticker-img">`;
  } else {
    msgDiv.className = `message ${isMe ? "my-message" : ""}`;
    let content = `<div class="author">@${data.user}</div>`;
    
    if (data.type === "file") {
      content += `<a href="${data.fileUrl}" target="_blank">📄 ${data.fileName}</a>`;
    } else {
      content += `<div class="text">${escapeHtml(data.text)}</div>`;
    }
    content += `<span class="time">${data.time}</span>`;
    msgDiv.innerHTML = content;
  }

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function renderRoomsList(rooms) {
  const roomsList = document.getElementById("roomsList");
  roomsList.innerHTML = "";
  rooms.forEach(r => addRoomToSidebar(r));
}

function addRoomToSidebar(roomName) {
  const roomsList = document.getElementById("roomsList");
  if (document.getElementById(`room-${roomName}`)) return;

  const li = document.createElement("li");
  li.id = `room-${roomName}`;
  li.className = `room-item ${roomName === currentRoom ? 'active' : ''}`;
  li.innerHTML = `<div class="room-icon">#</div><span class="room-name">${roomName}</span>`;
  li.onclick = () => switchRoom(roomName);
  roomsList.appendChild(li);
}

function switchRoom(roomName) {
  currentRoom = roomName;
  document.getElementById("currentRoomTitle").innerText = `# ${roomName}`;
  document.getElementById("messagesContainer").innerHTML = "";
  socket.emit("join_room", roomName);

  document.querySelectorAll(".room-item").forEach(el => {
    el.classList.toggle("active", el.id === `room-${roomName}`);
  });
}

function createRoom() {
  const name = prompt("Название нового чата:");
  if (!name) return;
  socket.emit("create_room", name);
}

function toggleStickerPicker() {
  document.getElementById("stickerPicker").classList.toggle("hidden");
}

function hideStickerPicker() {
  const picker = document.getElementById("stickerPicker");
  if (picker) picker.classList.add("hidden");
}

function handleKeyPress(e) { if (e.key === "Enter") sendMessage(); }
function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
