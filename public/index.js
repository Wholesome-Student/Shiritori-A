const socket = new WebSocket(`wss://${location.host}/ws`);
let username = null;

socket.addEventListener('error', (error) => {
  console.error(`websocket error:${error}`);
});

window.onload = () => {
  try {
    const btn = document.getElementById('btn');
    const input = document.getElementById('input');
    const outputs = document.getElementById('outputs');
    const readyBtn = document.getElementById('readyBtn');
    const statusDiv = document.getElementById('status');
    const usernameInput = document.getElementById('usernameInput');
    const setUsernameBtn = document.getElementById('setUsernameBtn');
    const resetBtn = document.getElementById('resetButton');

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
            cardId: '1',
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
        const li = document.createElement('li');
        li.textContent = `${data.sender}: ${data.message}`;
        outputs.appendChild(li);
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
