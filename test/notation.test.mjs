// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 좌표의 법칙 — 적는 법 · 점검 시험 (node --test src/lib/coord/test/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseLine, formatLine, parseList, formatList, letterOf, letterIndex, sup, sub } from "../src/coord/notation.mjs";
import { lintLine, lintList, passes } from "../src/coord/lint.mjs";

const EXAMPLES_FILE = fileURLToPath(new URL("./fixtures/canonical-examples.txt", import.meta.url));

test("흐름 글자는 알파벳 차례로 끝없이 (원리 1 4절)", () => {
  const cases = [[1, "A"], [26, "Z"], [27, "AA"], [52, "AZ"], [53, "BA"], [702, "ZZ"], [703, "AAA"]];
  for (const [n, s] of cases) {
    assert.equal(letterOf(n), s);
    assert.equal(letterIndex(s), n);
  }
  for (let n = 1; n <= 2000; n++) assert.equal(letterIndex(letterOf(n)), n);
  assert.throws(() => letterOf(0), /1부터/);
});

test("윗첨자 · 아래첨자", () => {
  assert.equal(sup(152), "¹⁵²");
  assert.equal(sub(10), "₁₀");
});

/** 문서 72의 코드 칸에 든 좌표 보기를 모두 꺼내요 — 둘 이상의 빈칸 뒤는 풀이 */
function docExamples() {
  return readFileSync(EXAMPLES_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
}

test("문서 72의 좌표 보기는 모두 읽히고, 다시 적으면 글자 하나 다르지 않아요 (12-19 정준 모양)", () => {
  const lines = docExamples();
  assert.ok(lines.length >= 55, `보기가 너무 적어요: ${lines.length}`);
  for (const line of lines) {
    const back = formatList(parseList(line));
    assert.equal(back, line, `다시 적으면 달라요: ${line}`);
  }
});

test("문서의 보기는 점검에서 error가 없어요 (줄임 · 꼴은 보기라 warn)", () => {
  for (const line of docExamples()) {
    const f = lintList(line);
    assert.ok(passes(f), `${line} → ${JSON.stringify(f.filter((x) => x.level === "error"))}`);
  }
});

test("코드가 남기는 긴 꼴은 그대로 통과해요", () => {
  const good = [
    "⌂4821736590⧖1791765000000 A 3² › B 5²₃‿₂",
    "@⌂4821736590⧖1791765000000⧖1791765012345",
    "@⌂4821736590⧖1789000000000 ⚒¹⁵²",
    "⌂4821736590⧖1791765000000 A 5² (∑24 = ∴∑2 + ¶∑4 + ⚒∑18)",
    "⌂4821736590⧖1791765000000 A 8 (▸∑4 = ▸¹∑3 + ▸²∑1)",
    "⌂4821736590⧖1791765000000 A 5² @2 ⑂¹ ☞¹ @4 (∑24)",
    "⌂4821736590⧖1791765000000 ▸¹⧖1791765400000 A 6 ~ A 9",
    "@⌂4821736590⧖1791765000000⧖1791765000000 ⬡²⧖1791765500000₁‿₂",
    "⌂4821736590⧖1791765000000 A 149²₄ › P 150¹",
  ];
  for (const line of good) {
    const f = lintLine(line, { stored: true });
    assert.ok(passes(f), `${line} → ${JSON.stringify(f)}`);
    assert.equal(formatLine(parseLine(line)), line);
  }
});

test("모름 □은 읽히고, 몇 개인지 알려요 (좌표 #169)", () => {
  const line = "⌂□⧖□ □ 153² › □ 154²";
  assert.equal(formatLine(parseLine(line)), line);
  const f = lintLine(line, { stored: true });
  assert.ok(passes(f));
  assert.ok(f.some((x) => x.code === "모름" && x.msg.includes("4개")));
});

test("점검은 틀린 것을 잡아요", () => {
  const bad = [
    ["⌂4821736590⧖1791765000000 A 5² (∑24 = ∴∑2 + ¶∑4 + ⚒∑17)", "등식"],
    ["⌂4821736590⧖1791765000000 A 5² (∑3 = ¶∑1 + ∴∑2)", "항의 차례"],
    ["⌂4821736590⧖1791765000000 A 5² ⑂¹ ∴", "차례"],
    ["⌂4821736590⧖1791765000000 A 5²  ∆¹", "읽기"],
    ["⌂4821736590⧖1791765000000 A 0²", "1부터"],
    ["⌂4821736590⧖1791765000000 A 5² ⚒¹", "일의 자리"],
    ["⌂4821736590⧖1791765000000 A 5² 예니", "한글"],
    ["A 5²", "긴 꼴"],
    ["@2 ✉⁷", "긴 꼴"],
  ];
  for (const [line, code] of bad) {
    const f = lintLine(line, { stored: true });
    assert.ok(!passes(f), `통과하면 안 돼요: ${line}`);
    assert.ok(f.some((x) => x.code === code), `${line}에서 ${code}를 잡아야 해요: ${JSON.stringify(f)}`);
  }
  assert.throws(() => parseLine("A 5₃"), /윗첨자 뒤에만/);
});
