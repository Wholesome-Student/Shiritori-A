const socket = new WebSocket(`ws://${location.host}/ws`);
let username = null;
let selectedImageId = undefined;

socket.addEventListener('error', (error) => {
  console.error(`websocket error:${error}`);
});

window.onload = () => {
  try {
    const btn = document.getElementById("btn");
    const input = document.getElementById("input");
    const outputs = document.getElementById("outputs");
    const readyBtn = document.getElementById("readyBtn");
    const statusDiv = document.getElementById("status");
    const usernameInput = document.getElementById("usernameInput");
    const setUsernameBtn = document.getElementById("setUsernameBtn");
    const resetBtn = document.getElementById("resetButton");
    const input2 = document.getElementById('input');
    const previousWordParagraph = document.getElementById('previousWord');
    const ruleParagraph = document.getElementById('rule');

    input2.addEventListener('input', function() {
      // フィールドに入力された文字数に応じて幅を変更
      input2.style.width = (this.value.length + 1) * 68 + 'px'; // 文字数に基づいて幅を計算
    });

    if (
      !btn || !input || !outputs || !readyBtn || !statusDiv || !usernameInput ||
      !setUsernameBtn
    ) {
      throw new Error('Required DOM is not found.');
    }

    setUsernameBtn.addEventListener('click', () => {
      const newUsername = usernameInput.value.trim();
      if (newUsername) {
        socket.send(
          JSON.stringify({ type: 'setUsername', username: newUsername }),
        );
      } else {
        alert('ユーザー名を入力してください');
      }
    });

    readyBtn.addEventListener('click', () => {
      if (username) {
        socket.send(JSON.stringify({ type: 'ready', username }));
        readyBtn.disabled = true;
        statusDiv.textContent = '準備完了！他のユーザーを待っています...';
      } else {
        console.error('Username not set');
        statusDiv.textContent = 'エラー: ユーザー名が設定されていません';
      }
    });

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      if (input.value && username) {
        socket.send(
          JSON.stringify({
            type: 'chat',
            username,
            message: input.value,
            cardId: selectedImageId,
            cardOption: '2',
          }),
        );
        input.value = '';
      } else if (!input.value) {
        alert('メッセージを入力してください');
      } else {
        console.error('Username not set');
        statusDiv.textContent = 'エラー: ユーザー名が設定されていません';
      }
    });

    resetBtn.addEventListener('click', () => {
      if (confirm('リセットしますか？')) {
        socket.send(JSON.stringify({ type: 'reset' }));
      }
    });

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'usernameSet') {
        username = data.username;
        statusDiv.textContent =
          `あなたは${username}として参加しています。準備ができたら「準備完了」ボタンを押してください。`;
        usernameInput.disabled = true;
        setUsernameBtn.disabled = true;
        readyBtn.disabled = false;
      } else if (data.type === 'error') {
        statusDiv.textContent = data.message;
      } else if (data.type === 'chat') {
        if ( data.sender === "Mission" ) {
          ruleParagraph.textContent = data.message;
        } else {
          const li = document.createElement('li');
          li.textContent = `${data.sender}: ${data.message}`;
          previousWordParagraph.textContent = data.message;
          outputs.appendChild(li);
        }
        if (
          data.sender === 'System' && data.message === 'チャットを開始します！'
        ) {
          btn.disabled = false;
          input.disabled = false;
        }
      }
    });

    // 初期状態ではチャット機能と準備完了ボタンを無効にする
    btn.disabled = true;
    input.disabled = true;
    readyBtn.disabled = true;
  } catch (error) {
    console.error(error);
  }
};

document.querySelectorAll(".card").forEach((img) => {
  // 各画像にクリックイベントを設定
  img.onclick = (event) => {
      const clickedImg = event.target;
      selectedImageId = clickedImg.getAttribute("data-id");

      // クリックされた画像のハイライトをトグル（ON/OFF）する
      clickedImg.classList.toggle("highlighted");

      // 他の画像からハイライトを外す
      document.querySelectorAll(".card").forEach((img) => {
          if (img !== clickedImg) {
          img.classList.remove("highlighted");
          }
      });
      if (!clickedImg.classList.contains("highlighted")) {
          selectedImageId = undefined;
      }
      };
});
