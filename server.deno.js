import { serve } from 'http/server.ts';
import { serveDir } from 'http/file_server.ts';


let users = {};
let sockets = [];
let currentTurn = null; // 現在のターンを管理する変数
let history = ["しりとり"]; // しりとりの履歴
let suffixMatch = 1;
let minimumStringLength = 2;
let isReverse = false;

serve((req) => {
  const pathname = new URL(req.url).pathname;
  console.log(pathname);
  
    // リセット処理
  if (request.method === "POST" && pathname === "/reset") {
    history = ["しりとり"];
    previousWord = "しりとり";
    return new Response(previousWord);
  }

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
            } else if (nextWord.length < minimumStringLength) {
              socket.send(JSON.stringify({
                type: 'error',
                message: '文字数が不足しています',
                errorCode: '10004'
              }));
            } else if (cardId === 0 && cardOption > nextWord.length) {
                socket.send(JSON.stringify({
                type: 'error',
                message: '文字数が不足しているため、カードが使えません。',
                errorCode: '10005'
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
    
        if (cardId !== undefined) {
      if (cardId === 0) {
        // 後方一致変更カード
        if (cardOption !== undefined) {
          suffixMatch = cardOption;
        }
      } else if (cardId === 1) {
        // 文字数下限変更カード
        if (cardOption !== undefined) {
          minimumStringLength = cardOption;
        }
      } else if (cardId === 2) {
        // リバースカード
        isReverse = !isReverse;
      }
    }

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