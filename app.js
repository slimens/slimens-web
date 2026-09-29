const SERVER_URL = "https://slimens-server.onrender.com"; // Измените на URL вашего сервера на Render
const socket = io(SERVER_URL);

let username = "";

// Запрос имени при открытии страницы
window.addEventListener("DOMContentLoaded", () => {
  while (!username || !username.trim()) {
    username = prompt("Введите имя телефапера:");
  }
  username = username.trim();
  document.getElementById("userBadge").innerText = `@${username}`;
});

// Загрузка истории из history_chat.json
socket.on("load_history", (history) => {
  const container = document.getElementById("messagesContainer");
  container.innerHTML = "";
  if (Array.isArray(history)) {
    history.forEach(msg => appendMessage(msg));
  }
});

// Получение нового сообщения в реальном времени
socket.on("receive_message", (data) => {
  appendMessage(data);
});

// Отправка текстового сообщения
function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text) return;

  socket.emit("send_message", {
    user: username,
    text: text,
    type: "text",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  input.value = "";
}

// Отправка файла
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
        user: username,
        fileUrl: data.url,
        fileName: data.name,
        type: "file",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      fileInput.value = "";
    }
  } catch (err) {
    alert("Ошибка отправки файла");
  }
}

// Добавление сообщения в чат
function appendMessage(data) {
  const container = document.getElementById("messagesContainer");
  const msgDiv = document.createElement("div");
  const isMe = data.user === username;

  msgDiv.className = `message ${isMe ? "my-message" : ""}`;

  let content = `<div class="author">@${escapeHtml(data.user)}</div>`;

  if (data.type === "file") {
    content += `<a href="${data.fileUrl}" target="_blank">📄 ${escapeHtml(data.fileName)}</a>`;
  } else {
    content += `<div class="text">${escapeHtml(data.text)}</div>`;
  }

  content += `<span class="time">${data.time}</span>`;
  msgDiv.innerHTML = content;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
