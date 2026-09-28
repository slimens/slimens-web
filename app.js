const SERVER_URL = "https://slimens-server.onrender.com"; // Ваш единственный сервер
const socket = io(SERVER_URL, { autoConnect: false });

let myNickname = "";
let currentRoom = "Общий чат";

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
      errorDiv.innerText = response ? response.message : "Этот никнейм уже занят!";
      socket.disconnect();
    }
  });
}

socket.on("connect_error", () => {
  const errorDiv = document.getElementById("authError");
  if (errorDiv) errorDiv.innerText = "Сервер просыпается... Подождите 30 секунд и нажмите еще раз.";
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

  const messageData = {
    room: currentRoom,
    user: myNickname,
    text: text,
    type: "text",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  socket.emit("send_message", messageData);
  messageInput.value = "";
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
    } else {
      alert("Не удалось загрузить файл.");
    }
  } catch (err) {
    alert("Ошибка соединения с сервером при отправке файла.");
  }
}

function appendMessage(data) {
  const container = document.getElementById("messagesContainer");
  const msgDiv = document.createElement("div");
  const isMe = data.user === myNickname;
  
  msgDiv.className = `message ${isMe ? "my-message" : ""}`;
  let content = `<div class="author">@${data.user} • ${data.time}</div>`;
  
  if (data.type === "file") {
    content += `<a href="${data.fileUrl}" target="_blank">📄 ${data.fileName}</a>`;
  } else {
    content += `<div class="text">${escapeHtml(data.text)}</div>`;
  }

  msgDiv.innerHTML = content;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
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
  li.innerText = `# ${name}`;
  li.onclick = () => switchRoom(name);
  document.getElementById("roomsList").appendChild(li);
  switchRoom(name);
}

function handleKeyPress(e) { if (e.key === "Enter") sendMessage(); }
function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
