// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 좌표의 법칙 — 적는 법 (research/72 원리 1 · 2 · 3)
// 좌표 줄 하나를 읽어 짜임으로 바꾸고(parseLine), 짜임을 늘 같은 글자로 다시 적어요(formatLine).
// 읽고 다시 적으면 글자 하나 다르지 않아야 해요(정준 모양 — 12-19). 모델 · 네트워크 · 화면 · 금고를 쓰지 않는 순수한 코드예요.
// 앱(TS)도, 맥 앱 틀(electron/*.mjs)도, node --test도 같은 파일을 그대로 읽게 .mjs로 둬요.

/** 윗첨자 숫자 — 몇 번째(자리) · 층 · 판 (12-7 · 12-20) */
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** 아래첨자 숫자 — 안의 자리 · 목차 (12-7) */
const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** 모름 — 옛 기록 · 바깥 기록을 읽을 때만 (12-7 · 좌표 #169) */
export const UNKNOWN = "□";
/** 보기에서 줄여 쓴 값(문서의 보기만 — 코드가 남기는 좌표에는 나오지 않아요) */
export const ELIDED = "…";
/** 문서의 꼴에서 "아무 숫자"를 뜻하는 윗첨자(문서의 보기만) */
export const ANY_SUP = "ⁿ";

/** 사건 안의 종류 — 등식의 항도 이 차례 (12-7 · 12-19) */
export const KINDS = ["∴", "¶", "⚒", "⇣", "⁂"];
/** 일 — 늘 숫자와 함께 (12-7 · 12-19) */
export const EVENTS = ["⑂", "✉", "⊕", "☞", "∆", "✦"];
export const TOGGLE = "▸";
export const MIND = "⬡";
export const SUM = "∑";
export const HOUSE = "⌂";
export const TIME = "⧖";
export const WHO = "@";
export const PATH_SEP = " › ";
export const RANGE_SEP = " ~ ";
export const LIST_SEP = " · ";

/** 숫자 → 윗첨자 */
export function sup(n) {
  if (n === UNKNOWN || n === ANY_SUP) return n;
  return String(n).replace(/\d/g, (d) => SUP[Number(d)]);
}

/** 숫자 → 아래첨자 */
export function sub(n) {
  if (n === UNKNOWN) return n;
  return String(n).replace(/\d/g, (d) => SUB[Number(d)]);
}

const isSupChar = (c) => SUP.includes(c);
const isSubChar = (c) => SUB.includes(c);
const isDigit = (c) => c >= "0" && c <= "9";
const isUpper = (c) => c >= "A" && c <= "Z";

/** 흐름 글자 — 1 → A … 26 → Z → 27 → AA (끝없이 · 원리 1 4절) */
export function letterOf(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`흐름 차례는 1부터예요: ${n}`);
  let s = "";
  while (n > 0) {
    n -= 1;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

/** 흐름 글자 → 차례 */
export function letterIndex(letters) {
  let n = 0;
  for (const c of letters) {
    if (!isUpper(c)) throw new Error(`흐름 글자가 아니에요: ${letters}`);
    n = n * 26 + (c.charCodeAt(0) - 64);
  }
  return n;
}

// ── 읽기 ────────────────────────────────────────────────────────────

class Reader {
  constructor(s) {
    this.s = s;
    this.i = 0;
  }
  get done() {
    return this.i >= this.s.length;
  }
  peek(k = 0) {
    return this.s[this.i + k];
  }
  rest() {
    return this.s.slice(this.i);
  }
  starts(t) {
    return this.s.startsWith(t, this.i);
  }
  eat(t) {
    if (this.starts(t)) {
      this.i += t.length;
      return true;
    }
    return false;
  }
  need(t, what) {
    if (!this.eat(t)) this.fail(`${what ?? `"${t}"`}이(가) 와야 해요`);
  }
  fail(msg) {
    throw new CoordError(msg, this.i, this.s);
  }
  /** 숫자 칸 하나 — 숫자 · 모름 · 줄여 쓴 값 */
  digits(what) {
    if (this.eat(UNKNOWN)) return UNKNOWN;
    if (this.eat(ELIDED)) return ELIDED;
    const at = this.i;
    while (!this.done && isDigit(this.peek())) this.i++;
    if (at === this.i) this.fail(`${what} 숫자가 와야 해요`);
    return this.s.slice(at, this.i);
  }
  /** 윗첨자 숫자 (없으면 null) */
  supNum() {
    if (this.eat(ANY_SUP)) return ANY_SUP;
    if (this.starts(UNKNOWN) && this.ctxSupUnknown) {
      this.i += 1;
      return UNKNOWN;
    }
    const at = this.i;
    while (!this.done && isSupChar(this.peek())) this.i++;
    if (at === this.i) return null;
    return [...this.s.slice(at, this.i)].map((c) => SUP.indexOf(c)).join("");
  }
  /** 아래첨자 숫자 하나 (없으면 null) */
  subNum() {
    const at = this.i;
    while (!this.done && isSubChar(this.peek())) this.i++;
    if (at === this.i) return null;
    return [...this.s.slice(at, this.i)].map((c) => SUB.indexOf(c)).join("");
  }
}

export class CoordError extends Error {
  constructor(msg, at, line) {
    super(`${msg} (${at}째 글자: ${JSON.stringify(line.slice(0, at))} ⟵ ${JSON.stringify(line.slice(at, at + 12))})`);
    this.at = at;
    this.line = line;
  }
}

/** 열쇠의 칸들 — [⌂집] [⧖세상] [⧖존재] (12-5 · 12-12) */
function readKeyCells(r) {
  const key = {};
  if (r.eat(HOUSE)) key.house = r.digits("집의 열쇠");
  const times = [];
  while (r.eat(TIME)) times.push(r.digits("때"));
  if (times.length) key.times = times;
  return key;
}

/** 자리 하나 — 흐름 글자 [빈칸 턴 [윗첨자 [아래첨자(‿아래첨자)*]]] */
function readPos(r) {
  let flow;
  if (r.eat(UNKNOWN)) flow = UNKNOWN;
  else {
    const at = r.i;
    while (!r.done && isUpper(r.peek())) r.i++;
    if (at === r.i) r.fail("흐름 글자가 와야 해요");
    flow = r.s.slice(at, r.i);
  }
  const pos = { flow };
  // 턴: 빈칸 하나 뒤의 숫자 (빈칸 뒤가 숫자 · 모름 · 줄임이 아니면 자리는 흐름 글자만)
  const next = r.peek(1);
  if (r.peek() === " " && next !== undefined && (isDigit(next) || next === UNKNOWN || next === ELIDED)) {
    r.i += 1;
    pos.turn = r.digits("턴");
    r.ctxSupUnknown = true;
    const ev = r.supNum();
    r.ctxSupUnknown = false;
    if (ev !== null) pos.event = ev;
    const subs = [];
    let s = r.subNum();
    while (s !== null) {
      subs.push(s);
      if (!r.eat("‿")) break;
      s = r.subNum();
      if (s === null) r.fail("‿ 뒤에 아래첨자가 와야 해요");
    }
    if (subs.length) {
      if (pos.event === undefined) r.fail("아래첨자(안)는 사건의 윗첨자 뒤에만 와요 — A 5₃은 없어요(12-19)");
      pos.inner = subs;
    }
  }
  return pos;
}

/** 지나온 길 — 자리 (› 자리)* */
function readPath(r) {
  const path = [readPos(r)];
  while (r.eat(PATH_SEP)) path.push(readPos(r));
  return path;
}

/** 총 양 — ( 항 [= 항 (+ 항)*] ) (12-8) */
function readSum(r) {
  r.need("(");
  const readTerm = () => {
    const term = {};
    const c = r.peek();
    if (KINDS.includes(c) || EVENTS.includes(c) || c === TOGGLE || c === MIND) {
      term.sym = c;
      r.i += 1;
      const layer = r.supNum();
      if (layer !== null) term.layer = layer;
    }
    r.need(SUM, "∑");
    term.n = r.digits("총 양");
    return term;
  };
  const sum = { total: readTerm() };
  if (r.eat(" = ")) {
    sum.terms = [readTerm()];
    while (r.eat(" + ")) sum.terms.push(readTerm());
  }
  r.need(")");
  return sum;
}

/** 일 하나 — 기호 + 윗첨자 (+ 빈칸 @대상) */
function readEvent(r) {
  const sym = r.peek();
  r.i += 1;
  const n = r.supNum();
  if (n === null) r.fail(`일 ${sym}에는 늘 숫자가 붙어요(12-19)`);
  return { sym, n };
}

/** @누구 — @숫자(세상 안) 또는 @열쇠 칸들 */
function readWho(r) {
  r.need(WHO);
  if (isDigit(r.peek())) return { n: r.digits("참여자") };
  if (r.peek() === UNKNOWN && !(r.peek(1) === HOUSE || r.peek(1) === TIME)) {
    r.i += 1;
    return { n: UNKNOWN };
  }
  const key = readKeyCells(r);
  if (!key.house && !key.times) r.fail("@ 뒤에는 숫자나 열쇠가 와야 해요");
  return { key };
}

/**
 * 좌표 줄 하나를 읽어요.
 * 줄의 첫머리가 틀을 정해요(12-19): 자리 · 토글 · 열쇠로 시작하면 그 자리의 일, @로 시작하면 그 존재의 것.
 * @param {string} line
 */
export function parseLine(line) {
  const r = new Reader(line);
  const out = {};
  if (r.starts(WHO)) {
    out.lead = "who";
    out.who = readWho(r);
  } else {
    if (r.starts(HOUSE) || r.starts(TIME)) {
      out.key = readKeyCells(r);
      if (r.done) {
        out.lead = "key";
        return out;
      }
      r.need(" ", "열쇠 뒤의 빈칸");
    }
    if (r.starts(TOGGLE)) {
      out.lead = "toggle";
      r.i += 1;
      r.ctxSupUnknown = true; // 옛 기록에서는 층을 모를 수 있어요(□)
      const layer = r.supNum();
      r.ctxSupUnknown = false;
      if (layer === null) r.fail("토글 ▸에는 늘 층 숫자가 붙어요(12-7)");
      out.toggle = { layer };
      if (r.eat(TIME)) out.toggle.built = r.digits("지은 때");
      // 토글 뒤의 범위 (없으면 토글 하나만 가리킴 — 12-5)
      if (r.starts(" ") && !r.starts(" (")) {
        r.i += 1;
        out.from = readPath(r);
        r.need(RANGE_SEP, "범위의 ~");
        out.to = readPath(r);
      }
    } else {
      out.lead = "place";
      out.path = readPath(r);
      if (r.eat(RANGE_SEP)) {
        out.lead = "range";
        out.to = readPath(r);
        out.from = out.path;
        delete out.path;
      }
    }
  }
  // 뒤에 붙는 것들 — 종류 → 말한 이 → 일 → (총 양) (12-19). 읽을 때는 차례를 따로 기록해 두고, 점검이 차례를 봐요.
  out.tail = [];
  while (!r.done) {
    r.need(" ", "칸 사이의 빈칸 하나");
    const c = r.peek();
    if (c === "(") {
      out.tail.push({ t: "sum", sum: readSum(r) });
    } else if (c === WHO) {
      out.tail.push({ t: "who", who: readWho(r) });
    } else if (c === MIND) {
      r.i += 1;
      const ed = r.supNum();
      if (ed === null) r.fail("맥락의 상 ⬡에는 늘 판 숫자가 붙어요(12-5)");
      const mind = { edition: ed };
      if (r.eat(TIME)) mind.built = r.digits("처음 지은 때");
      const subs = [];
      let s = r.subNum();
      while (s !== null) {
        subs.push(s);
        if (!r.eat("‿")) break;
        s = r.subNum();
      }
      if (subs.length) mind.toc = subs;
      out.tail.push({ t: "mind", mind });
    } else if (KINDS.includes(c)) {
      // ⚒ 뒤에 숫자가 붙으면 일(대화 밖의 일 · 12-14), 아니면 종류
      const n = (() => {
        const save = r.i;
        r.i += 1;
        const v = r.supNum();
        if (v === null) r.i = save;
        return v;
      })();
      if (n !== null) out.tail.push({ t: "event", ev: { sym: c, n } });
      else {
        r.i += 1;
        out.tail.push({ t: "kind", kind: c });
      }
    } else if (EVENTS.includes(c)) {
      out.tail.push({ t: "event", ev: readEvent(r) });
    } else {
      r.fail("알 수 없는 칸이에요");
    }
  }
  return out;
}

/**
 * 늘어놓기 — 한 줄(한 칸)에 좌표 여럿을 ` · `로 (12-19). ` · `는 좌표 문법 밖이라 좌표 안에는 나오지 않아요.
 * @param {string} line
 */
export function parseList(line) {
  return line.split(LIST_SEP).map(parseLine);
}

/** 좌표 여럿 → 늘어놓은 한 줄 */
export function formatList(xs) {
  return xs.map(formatLine).join(LIST_SEP);
}

// ── 적기 ────────────────────────────────────────────────────────────

function fmtKey(key) {
  let s = "";
  if (key.house !== undefined) s += HOUSE + key.house;
  for (const t of key.times ?? []) s += TIME + t;
  return s;
}

function fmtPos(p) {
  let s = p.flow;
  if (p.turn !== undefined) {
    s += " " + p.turn;
    if (p.event !== undefined) s += sup(p.event);
    if (p.inner) s += p.inner.map(sub).join("‿");
  }
  return s;
}

const fmtPath = (path) => path.map(fmtPos).join(PATH_SEP);

function fmtWho(w) {
  return WHO + (w.n !== undefined ? w.n : fmtKey(w.key));
}

function fmtTerm(t) {
  return (t.sym ?? "") + (t.layer !== undefined ? sup(t.layer) : "") + SUM + t.n;
}

function fmtSum(sum) {
  let s = "(" + fmtTerm(sum.total);
  if (sum.terms) s += " = " + sum.terms.map(fmtTerm).join(" + ");
  return s + ")";
}

/** 짜임 → 좌표 줄 (늘 같은 글자) */
export function formatLine(x) {
  let s = "";
  if (x.lead === "who") s = fmtWho(x.who);
  else {
    if (x.key) s = fmtKey(x.key);
    if (x.lead === "key") return s;
    if (x.key) s += " ";
    if (x.lead === "toggle") {
      s += TOGGLE + sup(x.toggle.layer);
      if (x.toggle.built !== undefined) s += TIME + x.toggle.built;
      if (x.from) s += " " + fmtPath(x.from) + RANGE_SEP + fmtPath(x.to);
    } else if (x.lead === "range") s += fmtPath(x.from) + RANGE_SEP + fmtPath(x.to);
    else s += fmtPath(x.path);
  }
  for (const c of x.tail ?? []) {
    s += " ";
    if (c.t === "sum") s += fmtSum(c.sum);
    else if (c.t === "who") s += fmtWho(c.who);
    else if (c.t === "kind") s += c.kind;
    else if (c.t === "event") s += c.ev.sym + sup(c.ev.n);
    else if (c.t === "mind") {
      s += MIND + sup(c.mind.edition);
      if (c.mind.built !== undefined) s += TIME + c.mind.built;
      if (c.mind.toc) s += c.mind.toc.map(sub).join("‿");
    }
  }
  return s;
}
