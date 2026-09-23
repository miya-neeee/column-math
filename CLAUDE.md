# このプロジェクトのルール

小学生向けの筆算ドリル。GitHub Pages（Deploy from a branch、main / root）で公開している静的サイト。

## 構成を変えない

- ファイルは `index.html` / `style.css` / `app.js` と、ホーム画面用アイコン `apple-touch-icon.png` の4つだけ。`index.html` はフォルダ直下に置く
- 外部ライブラリ・CDN・npm パッケージは使わない。`npm install` などは実行しない
- ビルド工程は作らない。編集したファイルがそのまま公開される

## 守ること

- 通信しない（`fetch` / `XMLHttpRequest` / `WebSocket` 等を使わない）
- ブラウザに保存しない（`localStorage` / `sessionStorage` / `indexedDB` / Cookie を使わない）
- 個人情報や成績履歴を扱う機能を足さない。アクセス解析も入れない
- `innerHTML` など、文字列を HTML として流し込む処理を使わない。要素は `app.js` の `h()` で作る

## CSP のため、次は動かない

`index.html` の CSP は `script-src 'self'; style-src 'self'; img-src 'self' data:`。

- HTML の `style="..."` 属性 → `style.css` にクラスを足す
- HTML に直接書く `<script>...</script>` や `onclick="..."` → `app.js` に書く
- CSP の内容を緩めない

## スマホ・タブレット

- 主な利用環境はスマホ・タブレットのブラウザ（ホーム画面に追加して使う）
- ボタンとマスには `touch-action: manipulation` を付けている（iOS のダブルタップ拡大を止めるため）。新しく押せる要素を足すときも付ける
- 古い端末（iOS 12 前後）でも動くように、`??` や `?.` などの新しい構文は使わない

## 作業の進め方

- `git push` はしない（公開内容を人が確認してから push する）
- 変更したら、`index.html` をブラウザで開いて動作を確認してもらう
