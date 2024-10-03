import { serve } from 'http/server.ts';
import { serveDir } from 'http/file_server.ts';

let users = {};
let sockets = [];
let currentTurn = null; // 現在のターンを管理する変数
let history = ["しりとり"]; // しりとりの履歴

serve((req) => {
  const pathname = new URL(req.url).pathname;
  console.log(pathname);

  if (pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
    const { response, socket } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      sockets.push(socket);
    };

    socket.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`Received: ${JSON.stringify(data)}`);
        
        if (data.type === 'setUsername') {
          if (users[data.username]) {
            socket.send(JSON.stringify({ type: 'error', message: 'ユーザー名は既に使用されています' }));
          } else {
            users[data.username] = { socket, ready: false };
            socket.send(JSON.stringify({ type: 'usernameSet', username: data.username }));
          }
        } else if (data.type === 'ready' && data.username) {
          if (users[data.username]) {
            users[data.username].ready = true;
            checkAndStartChat();
          } else {
            console.error(`User ${data.username} not found`);
          }
        } else if (data.type === 'chat' && data.username) {
          if (currentTurn === data.username) {
            const nextWord = data.message;
            const previousWord = history.slice(-1)[0];

            if (previousWord.slice(-1) !== nextWord.slice(0, 1)) {
              socket.send(JSON.stringify({
                type: 'error',
                message: '前の単語に続いていません',
                errorCode: '10001'
              }));
            } else if (nextWord.slice(-1) === "ん") {
              socket.send(JSON.stringify({
                type: 'error',
                message: '「ん」で終わりました',
                errorCode: '10002'
              }));
            } else if (history.includes(nextWord)) {
              socket.send(JSON.stringify({
                type: 'error',
                message: '過去に登場したことばです。',
                errorCode: '10003'
              }));
            } else {
              history.push(nextWord);
              broadcastMessage(data.username, nextWord);
              switchTurn(data.username);
            }
          } else {
            socket.send(JSON.stringify({ type: 'error', message: 'まだあなたのターンではありません' }));
          }
        } else {
          console.error('Invalid message format:', data);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    socket.onclose = () => {
      const username = Object.keys(users).find(key => users[key].socket === socket);
      if (username) {
        delete users[username];
      }
      sockets = sockets.filter(s => s !== socket);
    };

    return response;
  }

  return serveDir(req, {
    fsRoot: 'public',
    urlRoot: '',
    showDirListing: true,
    enableCors: true,
  });
});

function checkAndStartChat() {
  const readyUsers = Object.values(users).filter(user => user.ready);
  if (readyUsers.length === 2) {
    broadcastMessage('System', 'チャットを開始します！');
    broadcastMessage('System', 'しりとり');
    currentTurn = Object.keys(users)[0]; // 最初のユーザーから開始
    notifyTurn();
  }
}

function broadcastMessage(sender, message) {
  const messageObj = { type: 'chat', sender, message };
  sockets.forEach((s) => {
    try {
      s.send(JSON.stringify(messageObj));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  });
}

function switchTurn(currentUser) {
  const usernames = Object.keys(users);
  const nextUserIndex = (usernames.indexOf(currentUser) + 1) % usernames.length;
  currentTurn = usernames[nextUserIndex];
  notifyTurn();
}

function notifyTurn() {
  const messageObj = { type: 'turn', username: currentTurn };
  sockets.forEach((s) => {
    try {
      s.send(JSON.stringify(messageObj));
    } catch (error) {
      console.error('Failed to send turn notification:', error);
    }
  });
}