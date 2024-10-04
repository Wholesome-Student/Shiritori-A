const socket = new WebSocket(`ws://${location.host}/ws`);
const resetBtn = document.getElementById("resetButton");
const queryString = window.location.search;

// URLSearchParamsオブジェクトを使ってクエリを解析
const urlParams = new URLSearchParams(queryString);

// 'winner'という名前のパラメータを取得
const winner = urlParams.get("winner");

// 'winner'の値を画面に表示する
document.getElementById("winPlayer").textContent = winner + "の勝ちです!!!";

resetBtn.addEventListener("click", () => {
  socket.send(JSON.stringify({ type: "reset" }));
  window.location.href = "index.html";
});
