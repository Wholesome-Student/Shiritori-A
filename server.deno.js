import { serveDir } from "https://deno.land/std@0.223.0/http/file_server.ts";

let history = ["しりとり"];
// 後方一致の文字数
let suffixMatch = 1;
let minimumStringLength = 2;
let isReverse = false;

Deno.serve(async (request) => {
  // リクエスト
  const pathname = new URL(request.url).pathname;
  console.log(`pathname: ${pathname}`);

  // 過去最新の単語
  let previousWord = history.slice(-1)[0];

  if (request.method === "GET" && pathname === "/shiritori") {
    return new Response(previousWord);
  }

  // リセット処理
  if (request.method === "POST" && pathname === "/reset") {
    history = ["しりとり"];
    previousWord = "しりとり";
    return new Response(previousWord);
  }

  if (request.method === "POST" && pathname === "/shiritori") {
    // リクエストのペイロードを取得
    const requestJson = await request.json();
    // 送信された単語
    const nextWord = requestJson["nextWord"];
    // カードの種類
    const cardId = Number(requestJson["cardId"]);
    // カードの効力
    const cardOption = Number(requestJson["cardOption"]);

    if (
      (previousWord.slice(0, suffixMatch) !== nextWord.slice(-suffixMatch) &&
        isReverse) ||
      (previousWord.slice(-suffixMatch) !== nextWord.slice(0, suffixMatch) &&
        !isReverse)
    ) {
      // 前の単語につながっていない
      return new Response(
        JSON.stringify({
          errorMessage: "前の単語に続いていません",
          errorCode: "10001",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    } else if (nextWord.slice(-1) === "ん") {
      // 「ん」で終わっている
      return new Response(
        JSON.stringify({
          errorMessage: "「ん」で終わりました",
          errorCode: "10002",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    } else if (history.includes(nextWord)) {
      // 言葉が重複
      return new Response(
        JSON.stringify({
          errorMessage: "過去に登場したことばです。",
          errorCode: "10003",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    } else if (nextWord.length < minimumStringLength) {
      return new Response(
        JSON.stringify({
          errorMessage: "文字数が不足しています。",
          errorCode: "10004",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    } else if (cardId === 0 && cardOption > nextWord.length) {
      return new Response(
        JSON.stringify({
          errorMessage: "文字数が不足しているため、カードが使えません。",
          errorCode: "10005",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    } else {
      // 正答
      history.push(nextWord);
      previousWord = history.slice(-1)[0];
      console.log(history);
    }

    // カード
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

    return new Response(previousWord);
  }

  // ./public以下のファイルを公開
  return serveDir(request, {
    fsRoot: "./public/",
    urlRoot: "",
    enableCors: true,
  });
});
