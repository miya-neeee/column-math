/*
 * ひっさんノート — ひき算・わり算の筆算ドリル
 *
 * 外部ライブラリは使っていない。画面の要素はすべて createElement と
 * textContent で組み立てており、HTML 文字列を流し込む処理（innerHTML 等）は
 * 使っていない。通信・ブラウザへの保存も一切しない。
 */
"use strict";

(function () {
  /* ============================================================
     1. 問題づくり・筆算の手順・答え合わせ（画面に依存しない部分）
     ============================================================ */

  function cellOf(row, c) {
    const v = row.cells[c];
    return v == null ? "" : v;
  }

  const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const KURAI = ["一のくらい", "十のくらい", "百のくらい", "千のくらい"];
  const kurai = (i, len) => KURAI[len - 1 - i] || "";

  /* ---------- 問題づくり ---------- */

  function hasBorrow(a, b) {
    const s = String(a), len = s.length;
    const ad = s.split("").map(Number);
    const bd = String(b).padStart(len, "0").split("").map(Number);
    for (let i = len - 1; i >= 0; i--) if (ad[i] < bd[i]) return true;
    return false;
  }

  function genSub(digits) {
    const lv = digits === "two" ? "s1" : ["s2", "s3", "s4"][ri(0, 2)];
    for (let t = 0; t < 800; t++) {
      let a, b;
      if (lv === "s1") { a = ri(21, 99); b = ri(11, 98); }
      else if (lv === "s2") { a = ri(101, 999); b = ri(12, 99); }
      else if (lv === "s3") { a = ri(201, 999); b = ri(101, 898); }
      else {
        const h = ri(2, 9), o = ri(0, 4);
        a = h * 100 + o;
        b = Math.random() < 0.5
          ? ri(1, h - 1) * 100 + ri(1, 9) * 10 + ri(o + 1, 9)
          : ri(1, 9) * 10 + ri(o + 1, 9);
      }
      if (a - b < 1) continue;
      if (String(b).length > String(a).length) continue;
      if (!hasBorrow(a, b)) continue;
      return { type: "sub", a, b };
    }
    return digits === "two" ? { type: "sub", a: 62, b: 27 } : { type: "sub", a: 302, b: 148 };
  }

  // 割られる数のけた数ごとの範囲
  const DIV_ND = { n2: [10, 99], n3: [100, 999], n4: [1000, 9999] };
  // 割る数のけた数ごとの範囲と、組み合わせられる割られる数のけた数
  // （2けた÷2けたは商が1けたになりがちで単純すぎるため、割る数が2けたのときは割られる数を3〜4けたに限る）
  const DIV_DV = {
    one: { range: [2, 9], nd: ["n2", "n3", "n4"] },
    two: { range: [10, 99], nd: ["n3", "n4"] },
  };

  function genDivCore(dvRange, ndRange, forceZero) {
    for (let t = 0; t < 900; t++) {
      const d = ri(dvRange[0], dvRange[1]);
      if (forceZero) {
        const qlo = Math.max(10, Math.ceil(Math.ceil(ndRange[0] / d) / 10) * 10);
        const qhi = Math.floor(Math.floor(ndRange[1] / d) / 10) * 10;
        if (qhi < qlo) continue;
        const n = d * (ri(qlo / 10, qhi / 10) * 10) + ri(1, d - 1);
        if (n < ndRange[0] || n > ndRange[1]) continue;
        return { type: "div", a: n, b: d };
      }
      const n = ri(ndRange[0], ndRange[1]);
      if (n < d) continue;
      return { type: "div", a: n, b: d };
    }
    return { type: "div", a: 145, b: 12 };
  }

  function genDiv(dvKey) {
    const nds = DIV_DV[dvKey].nd;
    const ndRange = DIV_ND[nds[ri(0, nds.length - 1)]];
    const forceZero = Math.random() < 0.25;
    return genDivCore(DIV_DV[dvKey].range, ndRange, forceZero);
  }

  /* ---------- 筆算の手順 ---------- */

  function subSteps(a, b) {
    const s = String(a), len = s.length;
    const topW = s.split("").map(Number);
    const bd = String(b).padStart(len, "0").split("").map(Number);
    const marks = Array(len).fill(null);
    const res = Array(len).fill(null);
    const steps = [];
    for (let i = len - 1; i >= 0; i--) {
      const bot = bd[i];
      let borrow = null;
      if (topW[i] < bot) {
        let j = i - 1; const zeros = [];
        while (j >= 0 && topW[j] === 0) { zeros.push(j); j--; }
        topW[j] -= 1; marks[j] = topW[j];
        zeros.forEach((z) => { topW[z] = 9; marks[z] = 9; });
        topW[i] += 10; marks[i] = topW[i];
        borrow = { from: j, zeros: zeros.slice() };
      }
      res[i] = topW[i] - bot;
      steps.push({ col: i, top: topW[i], bot, val: res[i], borrow, marks: marks.slice(), res: res.slice() });
    }
    return {
      steps, len, answer: a - b, res, marks,
      topD: s.split("").map(Number), botD: bd,
      pad: len - String(b).length, padAns: len - String(a - b).length,
    };
  }

  function subText(st, len) {
    const name = kurai(st.col, len);
    if (!st.borrow) return [name + "：" + st.top + " − " + st.bot + " = " + st.val];
    const from = kurai(st.borrow.from, len);
    const orig = st.top - 10;
    const out = [];
    if (st.borrow.zeros.length === 0) {
      out.push(name + "：" + orig + " から " + st.bot + " はひけない。");
      out.push("となりの" + from + "から 1 かりてくる。");
      out.push(from + "は 1 へって、" + name + "は " + st.top + " になる。");
    } else {
      out.push(name + "：" + orig + " から " + st.bot + " はひけない。となりも 0 だから、" + from + "までかりに行く。");
      out.push(from + "は 1 へって、あいだの 0 は 9 になる。");
      out.push(name + "は " + st.top + " になる。");
    }
    out.push(st.top + " − " + st.bot + " = " + st.val);
    return out;
  }

  function divSteps(n, d) {
    const nd = String(n).split("").map(Number);
    const cols = nd.length;
    const q = Array(cols).fill(null);
    const steps = [];
    let rem = 0, started = false;
    for (let i = 0; i < cols; i++) {
      const cur = rem * 10 + nd[i];
      const qd = Math.floor(cur / d);
      if (qd === 0 && !started) { rem = cur; continue; }
      started = true;
      q[i] = qd;
      steps.push({ col: i, cur, q: qd, prod: qd * d, rem: cur - qd * d, zero: qd === 0 });
      rem = cur - qd * d;
    }
    return { d, n, cols, nd, q, steps, remainder: rem, quotient: Math.floor(n / d) };
  }

  function divRows(D) {
    const rows = [];
    D.steps.forEach((s, k) => {
      const p = String(s.prod), pc = {};
      for (let t = 0; t < p.length; t++) pc[s.col - p.length + 1 + t] = p[t];
      const curLen = String(s.cur).length;
      rows.push({
        kind: "prod", step: k, cells: pc,
        ulFrom: Math.min(s.col - curLen + 1, s.col - p.length + 1), ulTo: s.col,
      });
      const r = String(s.rem), rc = {};
      for (let t = 0; t < r.length; t++) rc[s.col - r.length + 1 + t] = r[t];
      if (s.col + 1 < D.cols) rc[s.col + 1] = String(D.nd[s.col + 1]);
      rows.push({ kind: "rem", step: k, cells: rc });
    });
    return rows;
  }

  function divText(D, k) {
    const s = D.steps[k];
    const out = [];
    if (k === 0) {
      if (s.col > 0) out.push("みる：" + D.d + " は " + D.nd.slice(0, s.col).join("") + " ではわれない。1つ右まで見て " + s.cur + " で考える。");
      else out.push("みる：いちばん左の " + s.cur + " から考える。");
    } else {
      out.push("おろす：右の " + D.nd[s.col] + " をおろして " + s.cur + "。");
    }
    if (s.zero) {
      out.push("たてる：" + s.cur + " の中に " + D.d + " は入らない。それでも" + kurai(s.col, D.cols) + "に 0 を書く。");
      out.push("※ ここで 0 を書きわすれると、答えが " + (String(D.quotient).replace(/0+$/, "") || "0") + " になってしまう。");
    } else {
      out.push("たてる：" + D.d + " × " + s.q + " = " + s.prod + " なら " + s.cur + " をこえない。" + kurai(s.col, D.cols) + "に " + s.q + "。");
    }
    out.push("かける：" + D.d + " × " + s.q + " = " + s.prod);
    out.push("ひく：" + s.cur + " − " + s.prod + " = " + s.rem);
    return out;
  }

  /* ---------- 答え合わせ ---------- */

  function checkBoxes(boxes, correct) {
    const filled = [];
    boxes.forEach((v, i) => { if (v !== "") filled.push(i); });
    if (!filled.length) return { ok: false, why: "empty" };
    if (filled[filled.length - 1] !== boxes.length - 1) return { ok: false, why: "align" };
    for (let i = 1; i < filled.length; i++) if (filled[i] !== filled[i - 1] + 1) return { ok: false, why: "gap" };
    const raw = filled.map((i) => boxes[i]).join("");
    const norm = raw.replace(/^0+/, "") || "0";
    if (norm === correct) return { ok: true, lead: raw !== norm };
    return { ok: false, why: "value" };
  }

  function checkWork(D, work) {
    if (!work.some((row) => row.some((v) => v !== ""))) return { skipped: true, ok: true, bad: new Set() };
    const canon = divRows(D);
    const off = work.findIndex((row) => row.some((v) => v !== ""));
    const bad = new Set();
    for (let r = 0; r < work.length; r++) {
      const cr = r - off >= 0 ? canon[r - off] : null;
      for (let c = 0; c < D.cols; c++) {
        const v = work[r][c];
        const want = cr ? cellOf(cr, c) : "";
        if (v === want) continue;
        if (v === "" && cr && cr.kind === "prod" && D.steps[cr.step].prod === 0) continue;
        if (v === "" && cr && cr.kind === "rem" && want === "0" && D.steps[cr.step].rem === 0) continue;
        bad.add(r + "," + c);
      }
    }
    return { skipped: false, ok: bad.size === 0, bad };
  }

  function checkQuotient(boxes, correct) {
    const base = checkBoxes(boxes, correct);
    if (base.ok) return base;
    const raw = boxes.filter((v) => v !== "").join("").replace(/^0+/, "");
    const stripped = correct.replace(/0+$/, "");
    if (raw && stripped && raw === stripped && correct !== stripped) return { ok: false, why: "zeroMissing" };
    return base;
  }

  /* ---------- ヒント ---------- */

  const SUB_HINTS = [
    { q: "どこから計算するの？", a: ["いちばん右の「一のくらい」から。", "右 → 左 のじゅんばんで、1つずつ計算する。"] },
    { q: "上の数が小さくてひけない", a: ["すぐ左のくらいから 1 かりてくる。", "かりた 1 は 10 になるので、上の数に 10 をたす。", "かした方のくらいは 1 へる。"] },
    { q: "となりが 0 でかりられない", a: ["さらに左のくらいまでかりに行く。", "かしたくらいは 1 へる。とちゅうの 0 は 9 になる。", "計算していたくらいは +10。"] },
    { q: "くり下がりのしるしの書き方", a: ["かしたくらいの上に、小さく「1へらした数」を書く。", "かりたくらいの上に、小さく「+10した数」を書く。", "元の数には線を引いて消しておくとまちがえにくい。"] },
    { q: "答えはどこに書くの？", a: ["計算したくらいの、まっすぐ下のマス。", "一のくらいの答えは、一のくらいの下。ずらさない。"] },
  ];

  const DIV_HINTS = [
    { q: "どこから計算するの？", a: ["大きいくらい（左）から。", "左から数字を取っていって、割る数より大きくなったところで最初の商を立てる。"] },
    { q: "商はどこに書くの？", a: ["今見ている数の、いちばん右のくらいの上。", "十のくらいまで見ているなら、商は十のくらいの上。"] },
    { q: "商がいくつかわからない", a: ["割る数 × 1、× 2、× 3 … とためす。", "今の数をこえない、いちばん大きいものが商。", "そろばんのかけ算がそのまま使えるところ。"] },
    { q: "「かける・ひく」がわからない", a: ["立てた商 × 割る数 を、今の数の下に書く。", "そのままひく。", "ひいた答えは、かならず割る数より小さくなる。大きかったら商が小さすぎ。"] },
    { q: "「おろす」ってなに？", a: ["ひいた答えの右どなりに、割られる数の次の数字を1つ書きうつすこと。", "1回に1つだけおろす。"] },
    { q: "商が 0 になるとき", a: ["今の数が割る数より小さくても、そのくらいに 0 を書く。", "0 を書かないと、答えのけた数がずれてしまう。", "書いたら 0 をかけて、0 をひいて、次へすすむ。"] },
    { q: "あまりはどうするの？", a: ["最後にひいて残った数があまり。", "あまりは、かならず割る数より小さい。", "そうなっていなければ、どこかの商が小さすぎる。"] },
  ];

  /* ============================================================
     2. 要素づくりの補助
     ============================================================ */

  // h("div", { class: "x", onclick: fn }, 子要素...) で要素を作る。
  // 文字はすべて textContent 相当（テキストノード）で入れるので、HTML として解釈されない。
  // CSP で style 属性が使えないため、style の指定は受け付けない。
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === "style") throw new Error("style 属性は使わない（style.css のクラスで指定する）");
        if (k === "class") el.className = v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else if (k === "disabled") el.disabled = true;
        else el.setAttribute(k, v === true ? "" : String(v));
      });
    }
    append(el, Array.prototype.slice.call(arguments, 2));
    return el;
  }

  function append(el, kids) {
    kids.forEach(function (kid) {
      if (kid == null || kid === false) return;
      if (Array.isArray(kid)) append(el, kid);
      else if (kid instanceof Node) el.appendChild(kid);
      else el.appendChild(document.createTextNode(String(kid)));
    });
  }

  function range(n) {
    return Array.from({ length: n }, function (_, i) { return i; });
  }

  /* ============================================================
     3. 状態
     ============================================================ */

  const state = {
    screen: "setup",                                  // setup / practice / result
    cfg: { kind: "mix", divisor: "one", digits: "two", count: 10 },
    problems: [],
    log: [],                                          // 問題ごとの正誤（true / false）

    // いま解いている問題
    idx: 0,
    sub: null,                                        // ひき算の手順（subSteps の結果）
    div: null,                                        // わり算の手順（divSteps の結果）
    boxes: [],                                        // ひき算の答え or わり算の商
    work: [],                                         // わり算のとちゅうの式
    rem: "",                                          // わり算のあまり
    focus: 0,                                         // 入力位置
    phase: "input",                                   // input / checked
    verdict: null,
    step: 0,                                          // 解説のステップ
    hint: null,
    hintOpen: false,
  };

  function current() {
    return state.problems[state.idx];
  }

  function isSub() {
    return current().type === "sub";
  }

  /* ============================================================
     4. 操作
     ============================================================ */

  function buildSet() {
    const out = [];
    for (let i = 0; i < state.cfg.count; i++) {
      const kind = state.cfg.kind === "mix" ? (Math.random() < 0.5 ? "sub" : "div") : state.cfg.kind;
      out.push(kind === "sub" ? genSub(state.cfg.digits) : genDiv(state.cfg.divisor));
    }
    return out;
  }

  function loadProblem(i) {
    const p = state.problems[i];
    const n = String(p.a).length;
    state.idx = i;
    state.sub = p.type === "sub" ? subSteps(p.a, p.b) : null;
    state.div = p.type === "div" ? divSteps(p.a, p.b) : null;
    state.boxes = Array(n).fill("");
    state.work = range(n * 2).map(function () { return Array(n).fill(""); });
    state.rem = "";
    state.focus = p.type === "sub" ? n - 1 : "q0";
    state.phase = "input";
    state.verdict = null;
    state.step = 0;
    state.hint = null;
    state.hintOpen = false;
  }

  function start(list) {
    state.problems = list && list.length ? list : buildSet();
    state.log = [];
    state.screen = "practice";
    loadProblem(0);
    render(true);
  }

  function goSetup() {
    state.screen = "setup";
    render(true);
  }

  function setCfg(key, value) {
    state.cfg[key] = value;
    render();
  }

  function setFocus(f) {
    if (state.phase !== "input") return;
    state.focus = f;
    render();
  }

  // わり算で ◀ ▶ を押したときにたどる順番
  function order() {
    const o = state.boxes.map(function (_, i) { return "q" + i; });
    state.work.forEach(function (row, r) {
      row.forEach(function (_, c) { o.push("w" + r + "_" + c); });
    });
    o.push("rem");
    return o;
  }

  function parseWork(f) {
    return String(f).slice(1).split("_").map(Number);
  }

  function pushDigit(ch) {
    if (state.phase !== "input") return;
    const f = state.focus;
    if (isSub()) {
      state.boxes[f] = ch;
      if (f > 0) state.focus = f - 1;                 // ひき算は右から左へ
    } else if (f === "rem") {
      const r = state.rem;
      state.rem = r.length >= 3 ? ch : r === "0" ? ch : r + ch;
    } else if (String(f).charAt(0) === "w") {
      const rc = parseWork(f);
      state.work[rc[0]][rc[1]] = ch;
      if (rc[1] < state.div.cols - 1) state.focus = "w" + rc[0] + "_" + (rc[1] + 1);
    } else {
      const i = Number(String(f).slice(1));
      state.boxes[i] = ch;                            // 商は左から右へ
      state.focus = i < state.boxes.length - 1 ? "q" + (i + 1) : "w0_0";
    }
    render();
  }

  // マスの値の読み書き（わり算は q / w / rem の3種類があるため）
  function getAt(f) {
    if (f === "rem") return state.rem;
    if (String(f).charAt(0) === "w") { const rc = parseWork(f); return state.work[rc[0]][rc[1]]; }
    return state.boxes[Number(String(f).slice(1))];
  }

  function clearAt(f) {
    if (f === "rem") state.rem = "";
    else if (String(f).charAt(0) === "w") { const rc = parseWork(f); state.work[rc[0]][rc[1]] = ""; }
    else state.boxes[Number(String(f).slice(1))] = "";
  }

  // 「けす」は一般的な Backspace と同じ動き。
  // 数字を入れると入力位置が次のマスへ進むので、今のマスが空なら
  // ひとつ前（直前に書いたマス）に戻って消す。
  function erase() {
    if (state.phase !== "input") return;
    const f = state.focus;
    if (isSub()) {
      if (state.boxes[f] !== "") state.boxes[f] = "";
      else if (f < state.boxes.length - 1) {             // ひき算は右から左へ書くので、前は右隣
        state.focus = f + 1;
        state.boxes[f + 1] = "";
      }
    } else if (f === "rem" && state.rem !== "") {
      state.rem = state.rem.slice(0, -1);                // あまりは1文字ずつ消す
    } else if (getAt(f) !== "") {
      clearAt(f);
    } else {
      const o = order();
      const at = o.indexOf(String(f));
      if (at > 0) {
        state.focus = o[at - 1];
        clearAt(o[at - 1]);
      }
    }
    render();
  }

  function move(dir) {
    if (state.phase !== "input") return;
    if (isSub()) {
      state.focus = Math.min(state.boxes.length - 1, Math.max(0, state.focus + dir));
    } else {
      const o = order();
      const at = o.indexOf(String(state.focus));
      state.focus = o[Math.min(o.length - 1, Math.max(0, at + dir))];
    }
    render();
  }

  function check() {
    if (state.phase !== "input") return;
    if (!state.boxes.some(function (v) { return v !== ""; })) return;
    let v;
    if (isSub()) {
      v = checkBoxes(state.boxes, String(state.sub.answer));
      v.kind = "sub";
    } else {
      const D = state.div;
      const rq = checkQuotient(state.boxes, String(D.quotient));
      const remOk = Number(state.rem === "" ? 0 : state.rem) === D.remainder;
      v = {
        ok: rq.ok && remOk, why: rq.why, lead: rq.lead,
        qOk: rq.ok, remOk: remOk,
        work: checkWork(D, state.work),
        kind: "div",
      };
    }
    state.verdict = v;
    state.log[state.idx] = v.ok;
    state.phase = "checked";
    state.hintOpen = false;
    render();
  }

  function next() {
    if (state.phase !== "checked") return;
    if (state.idx + 1 >= state.problems.length) state.screen = "result";
    else loadProblem(state.idx + 1);
    render(true);
  }

  function onKey(e) {
    if (state.screen !== "practice") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // ブラウザのショートカットは横取りしない
    if (e.key >= "0" && e.key <= "9" && e.key.length === 1) pushDigit(e.key);
    else if (e.key === "Backspace") erase();
    else if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
    else if (e.key === "Enter") { if (state.phase === "input") check(); else next(); }
    else return;
    e.preventDefault();
  }

  /* ============================================================
     5. 画面
     ============================================================ */

  function box(value, cls, label, onClick) {
    return h("div", {
      class: "box" + (cls ? " " + cls : ""),
      role: "button",
      "aria-label": label,
      onclick: onClick,
    }, value);
  }

  function viewBeads() {
    return h("div", { class: "rodwrap" },
      h("div", { class: "rod" }),
      h("div", { class: "beads" }, state.problems.map(function (_, i) {
        let c = "bead";
        if (state.log[i] === true) c += " done";
        else if (state.log[i] === false) c += " miss";
        if (i === state.idx) c += " now";
        return h("div", { class: c });
      })));
  }

  function viewNumpad() {
    return h("div", { class: "pad" },
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(function (k) {
        return h("button", { class: "key", type: "button", onclick: function () { pushDigit(k); } }, k);
      }),
      h("button", { class: "key util", type: "button", "aria-label": "ひとつ左", onclick: function () { move(-1); } }, "◀"),
      h("button", { class: "key util", type: "button", "aria-label": "ひとつ右", onclick: function () { move(1); } }, "▶"),
      h("button", { class: "key util wide", type: "button", onclick: erase }, "けす"));
  }

  /* ---------- ひき算 ---------- */

  // 子どもが書いたものをそのまま表示する。答え合わせのあとも置き換えない。
  function viewSubBoard() {
    const S = state.sub, ph = state.phase;
    return h("div", { class: "paper" },
      h("div", { class: "grow" },
        h("div", { class: "cell" }),
        S.topD.map(function (d) { return h("div", { class: "cell" }, d); })),
      h("div", { class: "grow" },
        h("div", { class: "cell op" }, "−"),
        S.botD.map(function (d, i) { return h("div", { class: "cell" }, i < S.pad ? "" : d); })),
      h("div", { class: "grow rule" },
        h("div", { class: "cell" }),
        state.boxes.map(function (v, i) {
          let cls = "";
          if (ph === "input" && state.focus === i) cls = "on";
          else if (ph === "checked") {
            cls = v === String(S.res[i]) || (v === "" && S.res[i] === 0 && i < S.padAns) ? "good" : "bad";
          }
          return box(v, cls, kurai(i, S.len), function () { setFocus(i); });
        })));
  }

  /* ---------- 解説用のちいさな筆算（正しいやり方） ---------- */

  function viewMiniSub(upto) {
    const S = state.sub, st = S.steps[upto];
    return h("div", { class: "paper mini" },
      h("div", { class: "grow" },
        h("div", { class: "cell" }),
        S.topD.map(function (d, i) {
          const m = st.marks[i];
          return h("div", { class: "cell" },
            m != null ? h("span", { class: "mark" }, m) : null,
            h("span", { class: m != null ? "struck" : "" }, d));
        })),
      h("div", { class: "grow" },
        h("div", { class: "cell op" }, "−"),
        S.botD.map(function (d, i) { return h("div", { class: "cell" }, i < S.pad ? "" : d); })),
      h("div", { class: "grow rule" },
        h("div", { class: "cell" }),
        S.res.map(function (v, i) { return h("div", { class: "cell rv" }, i >= st.col ? v : ""); })));
  }

  function viewMiniDiv(upto) {
    const D = state.div, canon = divRows(D), col = D.steps[upto].col;
    return [
      h("div", { class: "paper mini" },
        h("div", { class: "grow" },
          h("div", { class: "dcol ghost" }, D.d),
          D.q.map(function (v, i) { return h("div", { class: "cell rv" }, i <= col && v != null ? v : ""); })),
        h("div", { class: "grow" },
          h("div", { class: "dcol" }, D.d),
          h("div", { class: "bracket" }, D.nd.map(function (d) { return h("div", { class: "cell" }, d); }))),
        canon.slice(0, (upto + 1) * 2).map(function (r) {
          return h("div", { class: "grow" },
            h("div", { class: "dcol ghost" }, D.d),
            range(D.cols).map(function (c) {
              const ul = r.kind === "prod" && c >= r.ulFrom && c <= r.ulTo;
              return h("div", { class: "cell rv" + (ul ? " ul" : "") }, cellOf(r, c));
            }));
        })),
      upto === D.steps.length - 1 ? h("p", { class: "remmini" }, "あまり", h("b", null, D.remainder)) : null,
    ];
  }

  /* ---------- わり算 ---------- */

  function viewDivBoard() {
    const D = state.div, ph = state.phase, v = state.verdict;
    const workBad = ph === "checked" && v.work && !v.work.skipped ? v.work.bad : null;
    const remOk = String(state.rem === "" ? "0" : state.rem) === String(D.remainder);

    return [
      h("div", { class: "paper" },
        h("div", { class: "grow" },
          h("div", { class: "dcol ghost" }, D.d),
          state.boxes.map(function (val, i) {
            const want = D.q[i] == null ? "" : String(D.q[i]);
            let cls = "";
            if (ph === "input" && state.focus === "q" + i) cls = "on";
            else if (ph === "checked") cls = val === want ? "good" : "bad";
            return box(val, cls, "商の" + kurai(i, D.cols), function () { setFocus("q" + i); });
          })),
        h("div", { class: "grow" },
          h("div", { class: "dcol" }, D.d),
          h("div", { class: "bracket" }, D.nd.map(function (d) { return h("div", { class: "cell" }, d); }))),
        state.work.map(function (row, r) {
          return h("div", { class: "grow" },
            h("div", { class: "dcol ghost" }, D.d),
            row.map(function (val, c) {
              let cls = "work";
              if (ph === "input" && state.focus === "w" + r + "_" + c) cls += " on";
              else if (workBad) {
                if (workBad.has(r + "," + c)) cls += " bad";
                else if (val !== "") cls += " good";
              }
              return box(val, cls, "とちゅうの式", function () { setFocus("w" + r + "_" + c); });
            }));
        })),
      h("div", { class: "remrow" },
        h("span", null, "あまり"),
        box(state.rem,
          "rem " + (ph === "input" && state.focus === "rem" ? "on" : ph === "checked" ? (remOk ? "good" : "bad") : ""),
          "あまり", function () { setFocus("rem"); })),
    ];
  }

  /* ---------- ヒント ---------- */

  function viewHints() {
    const hints = isSub() ? SUB_HINTS : DIV_HINTS;
    const p = current();
    const here = isSub()
      ? "このもんだいなら → 一のくらいは " + String(p.a).slice(-1) + " − " + String(p.b).slice(-1) + " から。"
      : "このもんだいなら → まず " + state.div.steps[0].cur + " の中に " + state.div.d + " がいくつ入るかを考える。";
    return h("div", { class: "panel" },
      h("h3", null, "どこで止まっている？"),
      hints.map(function (hn, i) {
        const open = state.hint === i;
        return h("div", null,
          h("button", {
            class: "chip" + (open ? " sel" : ""), type: "button",
            onclick: function () { state.hint = open ? null : i; render(); },
          }, hn.q),
          open ? h("div", { class: "hintbody" },
            hn.a.map(function (line) { return h("p", null, line); }),
            h("p", { class: "here" }, here)) : null);
      }));
  }

  /* ---------- 練習画面 ---------- */

  function reasonText(v) {
    if (v.why === "empty") return "まだ書けていないマスがあるよ。";
    if (v.why === "align") return "書く場所がずれているよ。いちばん右のマスからうめてね。";
    if (v.why === "gap") return "とちゅうのマスがあいているよ。";
    if (v.why === "zeroMissing") return "0 を書きわすれているよ。数がとどかないくらいにも 0 を書く。";
    if (v.kind === "div" && v.qOk && !v.remOk) return "商は合っているよ。あまりをもう一度たしかめよう。";
    return null;
  }

  function viewPractice() {
    const sub = isSub(), S = state.sub, D = state.div, v = state.verdict;
    const total = sub ? S.steps.length : D.steps.length;
    const cur = Math.min(state.step, total - 1);
    const checked = state.phase === "checked";
    const wrong = checked && !v.ok;
    const workWrong = checked && v.work && !v.work.skipped && !v.work.ok;
    const stepping = wrong || workWrong;
    const last = state.idx + 1 >= state.problems.length;

    const inputArea = [
      viewNumpad(),
      h("button", {
        class: "btn main", type: "button",
        disabled: !state.boxes.some(function (x) { return x !== ""; }),
        onclick: check,
      }, "こたえあわせ"),
      h("button", {
        class: "btn quiet", type: "button",
        onclick: function () { state.hintOpen = !state.hintOpen; render(); },
      }, state.hintOpen ? "ヒントをとじる" : "ヒントを見る"),
      state.hintOpen ? viewHints() : null,
    ];

    const resultArea = checked ? [
      h("div", { class: "verdict" },
        h("div", { class: "mk " + (v.ok ? "o" : "x") }),
        h("span", null, v.ok ? "せいかい" : "おしい。やり方を見てみよう")),
      v.ok && v.lead ? h("p", { class: "note" }, "先頭の 0 は書かなくていいよ。") : null,
      v.ok && workWrong ? h("p", { class: "note" }, "こたえは合っているよ。とちゅうの式を見くらべてみよう。") : null,
      wrong && reasonText(v) ? h("p", { class: "note warn" }, reasonText(v)) : null,
      stepping ? h("div", { class: "panel" },
        h("h3", null, wrong ? "ただしいやり方" : "とちゅうの式をたしかめる"),
        sub ? viewMiniSub(cur) : viewMiniDiv(cur),
        h("div", { class: "steptext" },
          (sub ? subText(S.steps[cur], S.len) : divText(D, cur)).map(function (line) {
            return h("p", { class: line.charAt(0) === "※" ? "warn" : null }, line);
          })),
        h("div", { class: "stepnav" },
          h("button", {
            type: "button", disabled: state.step === 0,
            onclick: function () { state.step -= 1; render(); },
          }, "◀ もどる"),
          h("span", { class: "stepnum" }, (cur + 1) + " / " + total),
          h("button", {
            type: "button", disabled: state.step >= total - 1,
            onclick: function () { state.step += 1; render(); },
          }, "つぎ ▶")),
        wrong ? h("p", { class: "note" }, "こたえ：" + (sub
          ? S.answer
          : D.quotient + (D.remainder ? " あまり " + D.remainder : "（わりきれる）"))) : null,
        sub && String(S.answer).length < S.len
          ? h("p", { class: "note" }, "いちばん左が 0 になったときは、書かなくていいよ。") : null) : null,
      h("button", { class: "btn main", type: "button", onclick: next }, last ? "けっかを見る" : "つぎのもんだい"),
    ] : null;

    return h("div", { class: "wrap" },
      h("div", { class: "topbar" },
        h("span", null, (state.idx + 1) + " / " + state.problems.length + " もん目"),
        h("button", { class: "link", type: "button", onclick: goSetup }, "やめる")),
      viewBeads(),
      sub ? viewSubBoard() : viewDivBoard(),
      checked ? resultArea : inputArea);
  }

  /* ---------- 結果・設定 ---------- */

  function viewResult() {
    const ok = state.log.filter(function (x) { return x === true; }).length;
    const miss = state.problems.filter(function (_, i) { return state.log[i] === false; });
    return h("div", { class: "wrap" },
      h("div", { class: "head" }, h("h1", null, "おつかれさま"), h("p", null, "今日といた分だよ。")),
      h("div", { class: "tally" },
        h("div", { class: "tallybox" }, h("b", null, state.problems.length), h("span", null, "といた もんだい")),
        h("div", { class: "tallybox" }, h("b", { class: "ok" }, ok), h("span", null, "せいかい"))),
      miss.length ? h("div", { class: "panel" },
        h("h3", null, "もう一度やっておきたい問題"),
        miss.map(function (p) {
          return h("div", { class: "missrow" },
            h("span", null, p.a + " " + (p.type === "sub" ? "−" : "÷") + " " + p.b),
            h("small", null, p.type === "sub" ? "ひき算" : "わり算"));
        }),
        h("button", { class: "btn ghost mt", type: "button", onclick: function () { start(miss); } },
          "この " + miss.length + " 問をもう一度")) : null,
      h("button", { class: "btn main", type: "button", onclick: function () { start(); } }, "同じ設定でもう1セット"),
      h("button", { class: "btn quiet", type: "button", onclick: goSetup }, "設定を変える"));
  }

  function options(cls, items, key) {
    return h("div", { class: "opts " + cls }, items.map(function (it) {
      return h("button", {
        class: "opt" + (state.cfg[key] === it[0] ? " sel" : ""), type: "button",
        onclick: function () { setCfg(key, it[0]); },
      }, it[1]);
    }));
  }

  function viewSetup() {
    const showDivisor = state.cfg.kind !== "sub";
    const showDigits = state.cfg.kind !== "div";
    return h("div", { class: "wrap" },
      h("div", { class: "head" },
        h("h1", null, "ひっさんノート"),
        h("p", null, "マス目にそのまま書いて練習。")),
      h("div", { class: "sec" }, "なにをやる？"),
      options("three", [["sub", "ひき算"], ["div", "わり算"], ["mix", "りょうほう"]], "kind"),
      showDigits ? h("div", { class: "sec" }, "ひき算のけた数") : null,
      showDigits ? options("two", [["two", "2けた"], ["three", "3けた"]], "digits") : null,
      showDivisor ? h("div", { class: "sec" }, "わり算のわる数") : null,
      showDivisor ? options("two", [["one", "1けた"], ["two", "2けた"]], "divisor") : null,
      h("div", { class: "sec" }, "なんもん？"),
      options("three", [[5, "5もん"], [10, "10もん"], [20, "20もん"]], "count"),
      h("button", { class: "btn main start", type: "button", onclick: function () { start(); } }, "はじめる"),
      h("p", { class: "note center" }, "時間ははかりません。ゆっくりで大丈夫。"));
  }

  /* ============================================================
     6. 描画と起動
     ============================================================ */

  const root = document.getElementById("root");

  // 状態が変わるたびに画面全体を作り直す。要素数が少ないので十分速い。
  function render(toTop) {
    const view = state.screen === "setup" ? viewSetup()
      : state.screen === "practice" ? viewPractice()
      : viewResult();
    root.textContent = "";
    root.appendChild(view);
    if (toTop && typeof window.scrollTo === "function") {
      try { window.scrollTo(0, 0); } catch (err) { /* 未対応の環境では何もしない */ }
    }
  }

  window.addEventListener("keydown", onKey);
  render();
})();
