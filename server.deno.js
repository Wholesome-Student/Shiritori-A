import { serve } from "http/server.ts";
import { serveDir } from "http/file_server.ts";
import { randomInteger } from "https://deno.land/std@0.194.0/collections/_utils.ts";

let users = {};
let sockets = [];
let currentTurn = null; // 現在のターンを管理する変数
let history = ["しりとり"]; // しりとりの履歴
let suffixMatch = 1;
let minimumStringLength = 2;
let isReverse = false;
let missionId = 0;
let missionOption = "4";

function getRandomKana() {
  const kanaList = [
    "あ",
    "い",
    "う",
    "え",
    "お",
    "か",
    "き",
    "く",
    "け",
    "こ",
    "さ",
    "し",
    "す",
    "せ",
    "そ",
    "た",
    "ち",
    "つ",
    "て",
    "と",
    "な",
    "に",
    "ぬ",
    "ね",
    "の",
    "は",
    "ひ",
    "ふ",
    "へ",
    "ほ",
    "ま",
    "み",
    "む",
    "め",
    "も",
    "や",
    "ゆ",
    "よ",
    "ら",
    "り",
    "る",
    "れ",
    "ろ",
    "わ",
    "を",
    "ん",
  ];

  const randomIndex = Math.floor(Math.random() * kanaList.length);
  return kanaList[randomIndex];
}

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

        if (data.type === "setUsername") {
          if (users[data.username]) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "ユーザー名は既に使用されています",
              })
            );
          } else {
            users[data.username] = { socket, ready: false };
            socket.send(
              JSON.stringify({ type: "usernameSet", username: data.username })
            );
          }
        } else if (data.type === "ready" && data.username) {
          if (users[data.username]) {
            users[data.username].ready = true;
            checkAndStartChat();
          } else {
            console.error(`User ${data.username} not found`);
          }
        } else if (data.type === "end" && data.username) {
          const usernames = Object.keys(users);
          const nextUserIndex =
            (usernames.indexOf(data.username) + 1) % usernames.length;
          currentTurn = usernames[nextUserIndex];
          broadcastMessage("Gameover", currentTurn);
        } else if (data.type === "chat" && data.username) {
          if (currentTurn === data.username) {
            const nextWord = data.message;
            const previousWord = history.slice(-1)[0];
            // カードの種類
            const cardId = Number(data.cardId);
            // カードの効力
            const cardOption = Number(data.cardOption);

            if (
              (previousWord.slice(0, suffixMatch) !==
                nextWord.slice(-suffixMatch) &&
                isReverse) ||
              (previousWord.slice(-suffixMatch) !==
                nextWord.slice(0, suffixMatch) &&
                !isReverse)
            ) {
              socket.send(
                JSON.stringify({
                  type: "error",
                  message: "前の単語に続いていません",
                  errorCode: "10001",
                })
              );
            } else if (nextWord.slice(-suffixMatch) === "ん") {
              const usernames = Object.keys(users);
              const nextUserIndex =
                (usernames.indexOf(data.username) + 1) % usernames.length;
              currentTurn = usernames[nextUserIndex];
              broadcastMessage("Gameover", currentTurn);
            } else if (history.includes(nextWord)) {
              const usernames = Object.keys(users);
              const nextUserIndex =
                (usernames.indexOf(data.username) + 1) % usernames.length;
              currentTurn = usernames[nextUserIndex];
              broadcastMessage("Gameover", currentTurn);
            } else if (nextWord.length < minimumStringLength) {
              socket.send(
                JSON.stringify({
                  type: "error",
                  message: "文字数が不足しています",
                  errorCode: "10004",
                })
              );
            } else if (cardId === 0 && cardOption > nextWord.length) {
              socket.send(
                JSON.stringify({
                  type: "error",
                  message: "文字数が不足しているため、カードが使えません。",
                  errorCode: "10005",
                })
              );
            } else {
              history.push(nextWord);
              broadcastMessage(data.username, nextWord);
              switchTurn(data.username);

              if (missionId === 0) {
                // n文字以上
                if (nextWord > Number(missionOption)) {
                  socket.send(
                    JSON.stringify({
                      type: "success",
                      cardId: "1",
                      cardOption: "4",
                    })
                  );
                }
              } else if (missionId === 1) {
                // n文字ちょうど
                if (nextWord === Number(missionOption)) {
                  socket.send(
                    JSON.stringify({
                      type: "success",
                      cardId: "1",
                      cardOption: "4",
                    })
                  );
                }
              } else if (missionId === 2) {
                // 文字を含む
                if (nextWord.includes(missionOption)) {
                  socket.send(
                    JSON.stringify({
                      type: "success",
                      cardId: "1",
                      cardOption: "4",
                    })
                  );
                }
              } else {
                if (nextWord.includes(missionOption)) {
                  socket.send(
                    JSON.stringify({
                      type: "success",
                      cardId: undefined,
                      cardOption: undefined,
                    })
                  );
                }
              }
            }

            missionId = Math.floor(Math.random() * 3);
            if (missionId !== 2) {
              missionOption = String(4 + Math.floor(Math.random() * 3));
            } else {
              missionOption = getRandomKana();
            }

            let missionStr = "ミッション：";

            if (missionId === 0) {
              missionStr += missionOption + "文字以上の言葉";
            } else if (missionId === 1) {
              missionStr += missionOption + "文字ちょうどの言葉";
            } else if (missionId === 2) {
              missionStr += "「" + missionOption + "」" + "を含む文字";
            }

            broadcastMessage("Mission", missionStr);

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
          } else {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "まだあなたのターンではありません",
              })
            );
          }
        } else if (data.type === "reset") {
          history = ["しりとり"];
          broadcastMessage("System", "リセットします");
          checkAndStartChat();
        } else {
          console.error("Invalid message format:", data);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    socket.onclose = () => {
      const username = Object.keys(users).find(
        (key) => users[key].socket === socket
      );
      if (username) {
        delete users[username];
      }
      sockets = sockets.filter((s) => s !== socket);
    };

    return response;
  }

  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});

function checkAndStartChat() {
  const readyUsers = Object.values(users).filter((user) => user.ready);
  if (readyUsers.length === 2) {
    broadcastMessage("System", "チャットを開始します！");
    broadcastMessage("System", "しりとり");
    currentTurn = Object.keys(users)[0]; // 最初のユーザーから開始
    notifyTurn();
  }
}

function broadcastMessage(sender, message) {
  const messageObj = { type: "chat", sender, message };
  sockets.forEach((s) => {
    try {
      s.send(JSON.stringify(messageObj));
    } catch (error) {
      console.error("Failed to send message:", error);
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
  const messageObj = { type: "turn", username: currentTurn };
  sockets.forEach((s) => {
    try {
      s.send(JSON.stringify(messageObj));
    } catch (error) {
      console.error("Failed to send turn notification:", error);
    }
  });
}
