// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 좌표의 법칙 — 매기기 시험: 규칙마다 작은 세상 하나 (node --test src/lib/coord/test/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { stamp } from "../src/coord/stamp.mjs";
import { lintLine, passes } from "../src/coord/lint.mjs";

const H = "4821736590";
const W = "1791765000000";
const P = `⌂${H}⧖${W}`;
const world = (items, more = {}) => ({
  house: H,
  key: W,
  lettersKnown: true,
  people: [
    { id: "dad", n: "1", name: "아빠" },
    { id: "yeni", n: "2", name: "예니", agent: true },
  ],
  flows: [{ id: "f1", base: "dad" }],
  items,
  ...more,
});
let t = 1791765000000;
const at = () => (t += 1000);
const it = (what, more = {}) => ({ id: `i${t}`, t0: at(), flow: "f1", what, ...more });
const lines = (r) => [...r.places, ...r.events, ...r.turns, ...r.flows, ...r.beings, ...r.toggles].map((x) => x.line);
const allPass = (r) => {
  for (const l of lines(r)) assert.ok(passes(lintLine(l, { stored: true })), `점검 실패: ${l} ${JSON.stringify(lintLine(l, { stored: true }))}`);
};

test("기준이 말하면 턴이 열리고, 대화 상대의 답은 같은 턴의 둘째 사건 (원리 1 · 1:1 발언권 #160)", () => {
  const r = stamp(world([
    it("speak", { who: "dad" }),
    it("think", { who: "yeni", step: "s1" }),
    it("speak", { who: "yeni", step: "s1" }),
    it("stop", { who: "yeni" }),
    it("speak", { who: "dad" }),
    it("speak", { who: "yeni", step: "s2" }),
  ]));
  assert.deepEqual(r.findings, []);
  assert.deepEqual(r.events.map((e) => e.line), [
    `${P} A 1¹ @1 (∑1 = ¶∑1)`,
    `${P} A 1² @2 (∑2 = ∴∑1 + ¶∑1)`,
    `${P} A 2¹ @1 (∑1 = ¶∑1)`,
    `${P} A 2² @2 (∑1 = ¶∑1)`,
  ]);
  assert.ok(r.places.some((p) => p.line === `${P} A 1²₁ ∴`));
  allPass(r);
});

test("발언권 없이 말하면 점검이 잡아요 (12-13 6)", () => {
  const r = stamp(world([it("speak", { who: "dad" }), it("speak", { who: "yeni", step: "a" }), it("stop", { who: "yeni" }), it("speak", { who: "yeni", step: "b" })]));
  assert.ok(r.findings.some((f) => f.code === "발언권"));
});

test("깨우는 것은 약속 — 돌려줌이 닿으면 같은 턴의 다음 사건, 첫 안쪽이 ⇣ · 두 끝 (#160)", () => {
  const r = stamp(world([
    it("speak", { who: "dad" }),
    it("call", { who: "yeni", step: "s1", call: "c1", subs: 2 }),
    it("result", { call: "c1" }),
    it("speak", { who: "yeni", step: "s1" }),
    it("stop", { who: "yeni" }),
    it("arrive", { call: "c1" }),
    it("speak", { who: "yeni", step: "s2" }),
  ]));
  assert.deepEqual(r.findings, []);
  assert.ok(r.places.some((p) => p.line === `${P} A 1²₁ ⚒ ⑂¹ ⑂²`), "부름과 바로 온 결과는 ⚒ 한 자리 · 서브 둘");
  const arrive = r.places.find((p) => p.line === `${P} A 1³₁ ⇣`);
  assert.ok(arrive, "깨어난 사건의 첫 안쪽");
  assert.equal(arrive.link, `${P} A 1²₁`);
  assert.equal(r.turns[0].line, `${P} A 1 (∑3)`);
  allPass(r);
});

test("다른 걸음이 시작된 뒤에 닿은 결과는 ⇣ (두 끝) · 같은 걸음의 나란한 부름은 저마다 ⚒ (#169)", () => {
  const r = stamp(world([
    it("speak", { who: "dad" }),
    it("call", { who: "yeni", step: "s1", call: "a" }),
    it("call", { who: "yeni", step: "s1", call: "b" }),
    it("result", { call: "a" }),
    it("result", { call: "b" }),
    it("call", { who: "yeni", step: "s2", call: "c" }),
    it("think", { who: "yeni", step: "s3" }),
    it("result", { call: "c" }),
    it("stop", { who: "yeni" }),
  ]));
  assert.deepEqual(r.findings, []);
  const ps = r.places.map((p) => p.line);
  assert.deepEqual(ps.slice(1), [`${P} A 1²₁ ⚒`, `${P} A 1²₂ ⚒`, `${P} A 1²₃ ⚒`, `${P} A 1²₄ ∴`, `${P} A 1²₅ ⇣`]);
  assert.equal(r.places.at(-1).link, `${P} A 1²₃`);
});

test("알림 줄은 그것을 읽는 사건의 안 — 사용자의 말 앞에 와도 답의 첫 안쪽 (#169)", () => {
  const r = stamp(world([it("notice"), it("speak", { who: "dad" }), it("think", { who: "yeni", step: "s" }), it("stop", { who: "yeni" })]));
  assert.deepEqual(r.events.map((e) => e.line), [`${P} A 1¹ @1 (∑1 = ¶∑1)`, `${P} A 1² @2 (∑2 = ∴∑1 + ⇣∑1)`]);
  assert.equal(r.places[1].line, `${P} A 1²₁ ⇣`);
});

test("미리 있는 것은 자리가 없고, 값이 바뀌면 그 자리에 ∆ @그 에이전트 (#169)", () => {
  const r = stamp(world([
    it("preset", { key: "모드", value: "a", about: "yeni" }),
    it("speak", { who: "dad" }),
    it("think", { who: "yeni", step: "s" }),
    it("preset", { key: "모드", value: "a", about: "yeni" }),
    it("preset", { key: "모드", value: "b", about: "yeni" }),
    it("stop", { who: "yeni" }),
  ]));
  assert.deepEqual(r.findings, []);
  assert.equal(r.places.length, 2);
  assert.equal(r.places[1].line, `${P} A 1²₁ ∴ ∆¹ @2`);
  assert.deepEqual([...r.account.values()].filter((a) => a.how === "창의 모양").length, 2);
});

test("포크 — 안쪽 자리에서 나간 흐름은 그 사건의 다음 턴부터 · 길은 안쪽 자리까지 · 글자는 태어난 차례 (#170 · #171)", () => {
  const items = [
    it("speak", { who: "dad" }),
    it("call", { who: "yeni", step: "s", call: "c" }),
    it("result", { call: "c" }),
  ];
  const forkT = at();
  items.push({ id: "fk", t0: forkT, flow: "f2", from: "f1", what: "fork" });
  items.push(it("speak", { who: "yeni", flow: "f2" }));
  items.push(it("speak", { who: "sub", flow: "f2", step: "x" }));
  const w = world(items, {
    people: [{ id: "dad", n: "1" }, { id: "yeni", n: "2", agent: true }, { id: "sub", n: "3", agent: true }],
    flows: [{ id: "f1", base: "dad" }, { id: "f2", base: "yeni" }],
  });
  const r = stamp(w);
  assert.deepEqual(r.findings, []);
  assert.ok(r.places.some((p) => p.line === `${P} A 1²₁ ⚒ ⑂¹`));
  assert.ok(r.events.some((e) => e.line === `${P} A 1²₁ › B 2¹ @2 (∑1 = ¶∑1)`), r.events.map((e) => e.line).join("\n"));
  assert.ok(r.flows.some((f) => f.line === `${P} A 1²₁ › B (∑1)`));
  allPass(r);
});

test("대화 밖의 일은 그 일을 한 이에게 붙여 세고, 대상은 꼬리표에 (12-14 · #171)", () => {
  const r = stamp(world(
    [it("speak", { who: "dad" }), it("speak", { who: "yeni", step: "s" }), it("stop", { who: "yeni" }), it("outside", { who: "dad", label: "/compact" })],
    { people: [{ id: "dad", n: "1", keyCells: { house: H, times: ["1789000000000"] } }, { id: "yeni", n: "2", agent: true }] },
  ));
  assert.equal(r.beings[0].line, `@⌂${H}⧖1789000000000 ⚒¹`);
  assert.equal(r.beings[0].targetLine, `${P} A 1²`);
  allPass(r);
});

test("모든 기록은 꼭 한 번 — 빠지면 점검이 잡아요", () => {
  const r = stamp(world([it("speak", { who: "dad" }), { id: "x", t0: at(), flow: "f1", what: "없는것" }]));
  assert.ok(r.findings.some((f) => f.code === "무엇"));
});
