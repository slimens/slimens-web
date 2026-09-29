function login() {
  const nickname = document.getElementById("nicknameInput").value.trim().toLowerCase();
  const password = document.getElementById("passwordInput").value.trim();
  const errorDiv = document.getElementById("authError");

  if (!nickname || !password) {
    errorDiv.innerText = "Введите логин и пароль";
    return;
  }

  errorDiv.innerText = "Подключение к серверу...";

  if (!socket.connected) socket.connect();

  socket.emit("auth_user", { nickname, password }, (res) => {
    if (res && res.success) {
      myNickname = nickname;
      document.getElementById("displayNickname").innerText = `@${myNickname}`;
      document.getElementById("authModal").classList.add("hidden");
      document.getElementById("appContainer").classList.remove("hidden");

      renderRoomsList(res.rooms);
      switchRoom("Общий чат");

      // Отрисовываем историю чата из файла history_chat.json
      if (res.history && Array.isArray(res.history)) {
        document.getElementById("messagesContainer").innerHTML = "";
        res.history.forEach(msg => appendMessage(msg));
      }
    } else {
      errorDiv.innerText = res ? res.message : "Ошибка входа";
    }
  });
}
