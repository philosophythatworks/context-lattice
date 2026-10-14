// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 좌표의 법칙 — 점검 (원리 3 · 아빠 #161 "린트처럼 뭔가 잘 작동되는지 통과되는 구조 … 자율신경계처럼")
// 좌표 줄 하나 · 여럿을 보고 통과 · 실패를 내요. 실패는 까닭(낱말)과 함께예요. 고치지 않고 알리기만 해요.

import { parseLine, formatLine, KINDS, EVENTS, TOGGLE, UNKNOWN, ELIDED, ANY_SUP, LIST_SEP } from "./notation.mjs";

/**
 * @typedef {{ level: "error" | "warn" | "info", code: string, msg: string }} Finding
 */

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;

/** 숫자 칸이 원칙대로인가 — 1부터 · 앞자리 0 없음 (원리 1 "원칙은 1로 시작해요") */
function badNumber(v) {
  if (v === UNKNOWN || v === ELIDED || v === ANY_SUP || v === undefined) return false;
  return !/^[1-9]\d*$/.test(v);
}

/**
 * 좌표 줄 하나를 점검해요.
 * @param {string} line
 * @param {{ stored?: boolean }} [opts] stored = 코드가 남기는 좌표(늘 긴 꼴 · 줄임 없음)인지 — 문서의 보기는 false
 * @returns {Finding[]}
 */
export function lintLine(line, opts = {}) {
  /** @type {Finding[]} */
  const out = [];
  const err = (code, msg) => out.push({ level: "error", code, msg });
  const warn = (code, msg) => out.push({ level: opts.stored ? "error" : "warn", code, msg });

  if (HANGUL.test(line)) err("한글", "좌표에는 한글을 쓰지 않아요(원리 1)");
  if (line.includes(LIST_SEP)) err("늘어놓기", "좌표 하나에 ` · `가 들어 있어요 — 늘어놓기는 lintList로(12-19)");
  let x;
  try {
    x = parseLine(line);
  } catch (e) {
    err("읽기", e.message);
    return out;
  }
  const back = formatLine(x);
  if (back !== line) err("정준 모양", `다시 적으면 달라요: ${JSON.stringify(back)} (12-19 — 차례 · 빈칸 하나)`);

  // 긴 꼴 — 출발지 · 세상까지 (12-11 · 12-12 · 좌표 #148)
  const key = x.key ?? x.who?.key;
  if (x.lead === "who") {
    if (x.who.n !== undefined) warn("긴 꼴", "@n은 세상 안에서 줄여 쓴 보기예요 — 좌표로는 늘 @ + 출발지까지의 열쇠(12-14 · 12-19)");
    else if (!key.house) warn("긴 꼴", "열쇠에 출발지 ⌂가 없어요(좌표 #148)");
  } else if (x.lead !== "key") {
    if (!key) warn("긴 꼴", "출발지 · 세상의 열쇠가 없어요 — 보기는 줄여 써도 좌표는 늘 긴 꼴(좌표 #148)");
    else if (!key.house) warn("긴 꼴", "출발지 ⌂가 없어요(좌표 #148)");
  }

  // 줄임 · 문서의 꼴은 코드가 남기는 좌표에 나오지 않아요
  if (line.includes(ELIDED)) warn("줄임", "… 는 보기에서 줄여 쓴 값이에요");
  if (line.includes(ANY_SUP)) warn("꼴", "ⁿ 은 문서의 꼴(아무 숫자)이에요");
  const unknowns = [...line].filter((c) => c === UNKNOWN).length;
  if (unknowns) out.push({ level: "info", code: "모름", msg: `모르는 칸 ${unknowns}개 (□ — 옛 기록 · 바깥 기록)` });

  // 숫자 — 1부터
  const positions = [...(x.path ?? []), ...(x.from ?? []), ...(x.to ?? [])];
  for (const p of positions) {
    for (const v of [p.turn, p.event, ...(p.inner ?? [])]) if (badNumber(v)) err("1부터", `자리 숫자 ${v}는 1부터 · 앞자리 0 없이(원리 1)`);
  }

  // 뒤에 붙는 것들의 차례 — 종류 → 말한 이 → 일(→ 그 대상) → (총 양) (12-19)
  const tail = x.tail ?? [];
  const rank = { kind: 0, who: 1, event: 2, sum: 3, mind: 0 };
  let last = -1;
  let sawEvent = false;
  let kinds = 0;
  let sums = 0;
  for (const c of tail) {
    let r = rank[c.t];
    if (c.t === "who" && sawEvent) r = 2; // 일 바로 뒤의 @n은 그 일의 대상
    if (r < last) err("차례", "뒤에 붙는 것의 차례가 달라요 — 종류 → 말한 이 → 일 → (총 양)(12-19)");
    last = Math.max(last, r);
    if (c.t === "event") {
      sawEvent = true;
      if (badNumber(c.ev.n)) err("1부터", `일 ${c.ev.sym}의 숫자 ${c.ev.n}는 1부터(12-19)`);
      if (c.ev.sym === "⚒" && x.lead !== "who") err("일의 자리", "숫자가 붙은 ⚒(대화 밖의 일)는 @로 시작하는 줄에만 와요(12-14)");
    }
    if (c.t === "kind") kinds++;
    if (c.t === "sum") {
      sums++;
      out.push(...lintSum(c.sum));
    }
  }
  if (kinds > 1) err("종류", "종류는 자리마다 하나예요(12-7)");
  if (sums > 1) err("총 양", "총 양은 괄호 하나에 — 줄마다 하나(12-8)");
  if (x.lead === "who" && tail.some((c) => c.t === "kind")) err("종류", "@로 시작하는 줄에는 종류가 오지 않아요(12-19)");
  return out;
}

/** 총 양의 등식이 맞는가 · 항의 차례가 정해진 차례인가 (12-8 · 12-19) */
export function lintSum(sum) {
  /** @type {Finding[]} */
  const out = [];
  const known = (t) => /^\d+$/.test(t.n);
  if (!sum.terms) return out;
  if (known(sum.total) && sum.terms.every(known)) {
    const add = sum.terms.reduce((a, t) => a + Number(t.n), 0);
    if (add !== Number(sum.total.n)) out.push({ level: "error", code: "등식", msg: `${sum.total.n} ≠ ${sum.terms.map((t) => t.n).join(" + ")} = ${add}(12-8)` });
  }
  const kindTerms = sum.terms.every((t) => KINDS.includes(t.sym) && t.layer === undefined);
  const layerTerms = sum.terms.every((t) => t.sym === TOGGLE && t.layer !== undefined);
  if (kindTerms) {
    const idx = sum.terms.map((t) => KINDS.indexOf(t.sym));
    if (idx.some((v, i) => i && v <= idx[i - 1])) out.push({ level: "error", code: "항의 차례", msg: "종류의 항은 ∴ ¶ ⚒ ⇣ ⁂ 차례로 한 번씩(12-19)" });
  } else if (layerTerms) {
    const ls = sum.terms.map((t) => Number(t.layer));
    if (ls.some((v, i) => i && v <= ls[i - 1])) out.push({ level: "error", code: "항의 차례", msg: "층의 항은 ▸¹부터 위로 한 번씩(12-19)" });
  } else if (!sum.terms.every((t) => EVENTS.includes(t.sym))) {
    out.push({ level: "error", code: "항", msg: "한 등식의 항은 한 가지 축(종류 또는 층)으로만 나눠요(12-8)" });
  }
  return out;
}

/** 늘어놓은 한 줄을 점검해요 (12-19 — ` · `는 좌표 밖의 늘어놓기) */
export function lintList(line, opts = {}) {
  return line.split(LIST_SEP).flatMap((one) => lintLine(one, opts));
}

/** 통과인가 — error가 하나도 없을 때 */
export const passes = (findings) => !findings.some((f) => f.level === "error");
