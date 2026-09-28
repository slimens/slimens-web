const SERVER_URL = "https://slimens-server.onrender.com";
const socket = io(SERVER_URL, { autoConnect: false });

let myNickname = "";
let currentRoom = "Общий чат";

// Готовые публичные стикеры Telegram/Emoji CDN
const STICKER_LIST = [
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp", // Влюбленный
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp", // Смех
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp", // Крутой
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp", // Сердечки
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1fe60/512.webp", 
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp", // Лайк
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp", // Огонь
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp", // Праздник
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1fa90/512.webp"
];

// Инициализация сетки стикеров
window.onload = () => {
  const grid = document.getElementById("stickerGrid");
  if (grid) {
    STICKER_LIST.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.className = "sticker-option";
      img.onclick = () => sendSticker(url);
      grid.appendChild(img);
    });
  }
};

function login() {
  const input = document.getElementById("nicknameInput");
  const nickname = input.value.trim().replace(/^@/, '');
  const errorDiv = document.getElementById("authError");

  if (!nickname || nickname.length < 3) {
    errorDiv.innerText = "Никнейм должен быть от 3 символов";
    return;
  }

  errorDiv.innerText = "Подключение к серверу...";
  socket.connect();

  socket.emit("set_nickname", nickname, (response) => {
    if (response && response.success) {
      myNickname = nickname;
      document.getElementById("displayNickname").innerText = `@${myNickname}`;
      document.getElementById("authModal").classList.add("hidden");
      document.getElementById("appContainer").classList.remove("hidden");
      switchRoom("Общий чат");
    } else {
      errorDiv.innerText = response ? response.message : "Ошибка входа или ник занят";
      socket.disconnect();
    }
  });
}

socket.on("connect_error", () => {
  const errorDiv = document.getElementById("authError");
  if (errorDiv) errorDiv.innerText = "Сервер просыпается... Подождите 30 сек.";
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

// Отправка стикера
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
    msgDiv.innerHTML = `<img src="${data.stickerUrl}" class="sticker-img" title="@${data.user}">`;
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

function toggleStickerPicker() {
  const picker = document.getElementById("stickerPicker");
  picker.classList.toggle("hidden");
}

function hideStickerPicker() {
  const picker = document.getElementById("stickerPicker");
  if (picker) picker.classList.add("hidden");
}

function switchRoom(roomName) {
  currentRoom = roomName;
  document.getElementById("currentRoomTitle").innerText = `# ${roomName}`;
  document.getElementById("messagesContainer").innerHTML = "";
  socket.emit("join_room", roomName);

  document.querySelectorAll(".room-item").forEach(el => {
    el.classList.toggle("active", el.innerText.includes(roomName));
  });
}

function createRoom() {
  const name = prompt("Название новой комнаты:");
  if (!name) return;
  const li = document.createElement("li");
  li.className = "room-item";
  li.innerHTML = `<div class="room-icon">#</div><div class="room-details"><span class="room-name">${name}</span></div>`;
  li.onclick = () => switchRoom(name);
  document.getElementById("roomsList").appendChild(li);
  switchRoom(name);
}

function handleKeyPress(e) { if (e.key === "Enter") sendMessage(); }
function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
