// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 이음의 기록 읽기 시험 — 이음 금고의 모양(Conversation)을 본뜬 작은 지도 하나 (아빠 데이터는 쓰지 않아요)
import { test } from "node:test";
import assert from "node:assert/strict";
import { flowOrder, opensWorld, readIeum, worldsOf } from "../src/coord/read/ieum.mjs";
import { stamp } from "../src/coord/stamp.mjs";
import { lintLine, passes } from "../src/coord/lint.mjs";
import { renderStamp } from "../src/coord/render.mjs";

const u = (id, t, text, meta = {}, extra = []) => ({ id, role: "user", parts: [...extra, ...(text ? [{ type: "text", text }] : [])], metadata: { createdAt: t, ...meta } });
const a = (id, t, parts, meta = {}) => ({ id, role: "assistant", parts: [{ type: "step-start" }, ...parts], metadata: { createdAt: t, modelId: "opus", ...meta } });
const tool = (name, id, input = {}) => ({ type: `tool-${name}`, toolCallId: id, state: "output-available", input, output: { ok: true } });
const line = (root, parent, msg, turn) => ({ root, origin: { line: parent, msg, turn } });

/** 처음 흐름 R · 서브 둘(S1 · S2 — R의 부름 c1에서) · 사람이 연 포크 F(R의 첫 답에서) · 맥락 없이 연 내 흐름 N(R의 둘째 사건에서) */
const MAP = {
  user: { name: "아빠" },
  conversations: [
    {
      id: "R", createdAt: 1000, partner: { name: "예니" },
      messages: [
        u("m1", 1000, "안녕"),
        a("m2", 1001, [{ type: "reasoning", text: "…" }, { type: "text", text: "서브를 보낼게요" }, tool("sub_send", "c1", { tasks: [{}, {}] })]),
        u("m3", 2000, null, { join: { msg: "m2", call: "c1", at: 1, done: 2, fail: 0, stop: 0, gap: 0 } }, [{ type: "text", text: "(결과)" }]),
        a("m4", 2001, [{ type: "text", text: "결과가 왔어요" }]),
        u("m5", 3000, "다음", {}, [{ type: "data-attachment", data: { kind: "line" } }]),
        a("m6", 3001, [tool("intent_set", "c2", { intent: "좌표 세우기" }), { type: "text", text: "네" }], { modelId: "sonnet" }),
      ],
    },
    {
      id: "S1", createdAt: 1500, line: line("R", "R", "m2", 0),
      messages: [u("s1", 1500, "조사 1", { by: "R", sub: { call: "c1", i: 1, of: 2, at: 1, name: "M1", sender: "M", title: "조사" } }), a("s2", 1501, [{ type: "text", text: "끝" }])],
    },
    {
      id: "S2", createdAt: 1600, line: line("R", "R", "m2", 0),
      messages: [u("t1", 1600, "조사 2", { by: "R", sub: { call: "c1", i: 2, of: 2, at: 1, name: "M2", sender: "M", title: "조사" } }), a("t2", 1601, [{ type: "text", text: "끝" }])],
    },
    {
      id: "F", createdAt: 4000, line: line("R", "R", "m2", 1),
      messages: [
        { ...u("m1", 1000, "안녕"), metadata: { createdAt: 1000, from: "R" } },
        { ...a("m2", 1001, [{ type: "text", text: "…" }]), metadata: { createdAt: 1001, from: "R" } },
        u("f1", 4000, "다르게 가 보자"),
        a("f2", 4001, [{ type: "text", text: "좋아요" }]),
      ],
    },
    {
      id: "N", createdAt: 5000, line: line("R", "R", "m4", 0),
      messages: [u("n1", 5000, "새로", { hand: { ctx: "none", at: 1 } }), a("n2", 5001, [{ type: "text", text: "네" }])],
    },
  ],
};

const { world, notes } = readIeum(MAP);
const r = stamp(world);
const P = "⌂□⧖1000";
const all = [...r.places, ...r.events, ...r.turns, ...r.flows, ...r.beings, ...r.toggles].map((x) => x.line);

test("이음의 지도 하나 — 모든 기록이 한 번씩 · 점검 0 · 긴 꼴 통과", () => {
  assert.deepEqual(notes, []);
  assert.deepEqual(r.findings, []);
  assert.equal(r.account.size, world.items.length);
  for (const l of all) assert.ok(passes(lintLine(l, { stored: true })), `${l} ${JSON.stringify(lintLine(l, { stored: true }))}`);
});

test("처음 흐름은 A · 흐름 글자와 턴은 태어난 차례대로 다시 매김 (#171)", () => {
  const ev = r.events.map((e) => e.line);
  assert.ok(ev.includes(`${P} A 1¹ @1 (∑1 = ¶∑1)`));
  // 서브 둘과 사람이 연 포크가 같은 답(A 1²)에서 — 서브는 보낸 부름의 자리에서(⑂¹ ⑂²), 포크는 그 답에서(⑂¹)
  assert.ok(ev.includes(`${P} A 1² @2 ⑂¹ (∑3 = ∴∑1 + ¶∑1 + ⚒∑1)`), ev.join("\n"));
  assert.ok(all.includes(`${P} A 1²₃ ⚒ ⑂¹ ⑂²`));
  // 합류 = 약속을 지키는 돌려줌 → 같은 턴의 셋째 사건 · 첫 안쪽 ⇣ · 두 끝 (#160)
  assert.ok(ev.includes(`${P} A 1³ @2 ⑂¹ (∑2 = ¶∑1 + ⇣∑1)`), ev.join("\n"));
  assert.equal(r.places.find((p) => p.line === `${P} A 1³₁ ⇣`)?.link, `${P} A 1²₃`);
  // 서브의 흐름 — 보낸 쪽(@2)이 기준 · 그 사건의 다음 턴부터 · 길은 안쪽 자리까지
  assert.ok(ev.includes(`${P} A 1²₃ › B 2¹ @2 (∑1 = ¶∑1)`));
  assert.ok(ev.includes(`${P} A 1²₃ › B 2² @3 (∑1 = ¶∑1)`));
  assert.ok(ev.includes(`${P} A 1²₃ › C 2² @4 (∑1 = ¶∑1)`));
  // 사람이 연 포크 — 물려받은 글(from)은 읽지 않고 주인 흐름의 좌표 그대로 · 새 흐름은 2부터
  assert.ok(ev.includes(`${P} A 1² › D 2¹ @1 (∑1 = ¶∑1)`));
  assert.ok(ev.includes(`${P} A 1³ › E 2² @6 (∑1 = ¶∑1)`));
});

test("모델이 바뀌면 사용자의 말 사건에 ∆ @그 에이전트 · 의도를 적은 부름에 ∆ · 전달받은 결과는 답의 첫 안쪽 ⇣ (12-6 · 12-10)", () => {
  assert.ok(all.includes(`${P} A 2¹ @1 ∆¹ @2 (∑1 = ¶∑1)`), all.join("\n"));
  assert.ok(all.includes(`${P} A 2²₁ ⇣`));
  assert.ok(all.includes(`${P} A 2²₂ ⚒ ∆¹`));
  assert.ok(all.includes(`${P} A (∑2)`));
  assert.ok(all.includes(`${P} A 1²₃ › B (∑1)`));
});

test("빈 시작 자리에서 연 흐름은 다른 세상으로 알려요 (원리 1 2-3)", () => {
  const map = { conversations: [...MAP.conversations, { id: "Z", createdAt: 6000, line: line("R", "R", null, 0), messages: [u("z1", 6000, "처음부터")] }] };
  const { notes: ns, world: w } = readIeum(map);
  assert.ok(ns.some((x) => x.startsWith("Z:")));
  assert.ok(!w.flows.some((f) => f.id === "Z"));
});

test("한 장의 글로 (보기)", () => {
  const text = renderStamp(r);
  assert.ok(text.startsWith(`${P} A 1¹ @1`));
});

test("사용자가 말에 붙인 파일은 그 말 사건 안의 ⇣ (#175)", () => {
  const map = { conversations: [{ id: "R", createdAt: 1000, messages: [u("m1", 1000, "이거 봐 줘", {}, [{ type: "data-attachment", data: { kind: "image" } }]), a("m2", 1001, [{ type: "text", text: "네" }])] }] };
  const s = stamp(readIeum(map).world);
  assert.deepEqual(s.findings, []);
  const lines = [...s.events, ...s.places].map((x) => x.line);
  assert.ok(lines.includes("⌂□⧖1000 A 1¹ @1 (∑2 = ¶∑1 + ⇣∑1)"), lines.join("\n"));
  assert.ok(lines.includes("⌂□⧖1000 A 1¹₂ ⇣"));
});

test("금고의 줄 → 대화 지도 (자동 점검이 임시 금고를 읽는 길과 같은 질의)", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { mapsFromRows } = await import("../src/coord/read/ieum.mjs");
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE conversation (user_id TEXT, id TEXT, title TEXT, model_id TEXT, created_at INTEGER, updated_at INTEGER, root_id TEXT, origin_line TEXT, origin_msg TEXT, origin_turn INTEGER);
           CREATE TABLE message (user_id TEXT, conversation_id TEXT, id TEXT, parent_id TEXT, seq INTEGER, role TEXT, parts_json TEXT, metadata_json TEXT, created_at INTEGER);`);
  const ic = db.prepare("INSERT INTO conversation VALUES (?,?,?,?,?,?,?,?,?,?)");
  const im = db.prepare("INSERT INTO message VALUES (?,?,?,?,?,?,?,?,?)");
  for (const c of MAP.conversations) {
    ic.run("u1", c.id, c.id, "opus", c.createdAt, c.createdAt, c.line?.root ?? null, c.line?.origin.line ?? null, c.line?.origin.msg ?? null, c.line?.origin.turn ?? null);
    c.messages.forEach((m, i) => {
      const { createdAt, ...meta } = m.metadata;
      im.run("u1", c.id, m.id, null, i, m.role, JSON.stringify(m.parts), JSON.stringify(meta), createdAt);
    });
  }
  const convs = db.prepare("SELECT user_id, id, title, model_id, created_at, root_id, origin_line, origin_msg, origin_turn FROM conversation").all();
  const msgs = db.prepare("SELECT user_id, conversation_id, id, role, parts_json, metadata_json, created_at, seq FROM message").all();
  const maps = mapsFromRows(convs, msgs);
  assert.equal(maps.length, 1);
  const s2 = stamp(readIeum(maps[0]).world);
  assert.deepEqual(s2.findings, []);
  assert.equal(renderStamp(s2), renderStamp(r));
});

test("금고의 때가 거꾸로여도 — 질문을 보낸 때 = 바로 뒤 답이 만들어진 때 (앱의 stampSent와 같은 규칙 · 자동 점검에서 찾음)", () => {
  const map = { conversations: [{ id: "R", createdAt: 1000, messages: [
    { id: "q", role: "user", parts: [{ type: "text", text: "질문" }], metadata: { createdAt: 5000 } }, // 금고의 저장 때가 답보다 늦음
    { id: "ans", role: "assistant", parts: [{ type: "step-start" }, { type: "text", text: "답" }], metadata: { createdAt: 4900 } },
  ] }] };
  const s = stamp(readIeum(map).world);
  assert.deepEqual(s.findings, []);
  assert.deepEqual(s.events.map((e) => e.line), ["⌂□⧖4900 A 1¹ @1 (∑1 = ¶∑1)", "⌂□⧖4900 A 1² @2 (∑1 = ¶∑1)"]);
});

test("모두 같은 1/1000초에 적혀도 포크는 태어난 답 뒤에 · 부름이 없는 서브는 그 답에서(알림) (자동 점검의 씨앗)", () => {
  const T = 7000;
  const msg = (id, role, text, meta = {}) => ({ id, role, parts: [{ type: "text", text }], metadata: { createdAt: T, ...meta } });
  const map = { conversations: [
    { id: "R", createdAt: T, messages: [msg("r1", "user", "하나"), msg("r2", "assistant", "답")] },
    { id: "F", createdAt: T + 1, line: line("R", "R", "r2", 1), messages: [msg("r1", "user", "하나", { from: "R" }), msg("r2", "assistant", "답", { from: "R" }), msg("f1", "user", "포크의 말"), msg("f2", "assistant", "포크의 답")] },
    { id: "S", createdAt: T + 2, line: line("R", "R", "r2", 0), messages: [msg("s1", "user", "맡은 일", { by: "R", sub: { call: "없는-부름", at: 1, i: 1, of: 1 } }), msg("s2", "assistant", "맡은 일의 답")] },
  ] };
  const s = stamp(readIeum(map).world);
  assert.deepEqual(s.findings.filter((f) => f.level === "error"), []);
  assert.ok(s.findings.some((f) => f.level === "warn" && f.code === "두 끝"));
  assert.ok(s.events.some((e) => e.line === `⌂□⧖${T} A 1² @2 ⑂¹ ⑂² (∑1 = ¶∑1)`), s.events.map((e) => e.line).join("\n"));
  assert.ok(s.events.some((e) => e.line === `⌂□⧖${T} A 1² › B 2¹ @1 (∑1 = ¶∑1)`));
  assert.ok(s.events.some((e) => e.line === `⌂□⧖${T} A 1² › C 2¹ @2 (∑1 = ¶∑1)`));
});

test("부모가 늘 먼저 — 포크의 만든 때가 뿌리보다 일러도(점검의 씨앗) 태어난 답 뒤에 (자동 점검에서 찾음)", () => {
  const msg = (id, role, text, t, meta = {}) => ({ id, role, parts: [{ type: "text", text }], metadata: { createdAt: t, ...meta } });
  const map = { conversations: [
    { id: "R", createdAt: 9000, messages: [msg("r1", "user", "하나", 9000), msg("r2", "assistant", "답", 9001)] },
    { id: "F", createdAt: 8000, line: line("R", "R", "r2", 1), messages: [msg("r1", "user", "하나", 8000, { from: "R" }), msg("r2", "assistant", "답", 8000, { from: "R" }), msg("f1", "user", "포크", 8001), msg("f2", "assistant", "포크의 답", 8002)] },
  ] };
  const { world, notes } = readIeum(map);
  assert.deepEqual(notes, []);
  const s = stamp(world);
  assert.deepEqual(s.findings, []);
  assert.ok(s.events.some((e) => e.line === "⌂□⧖9000 A 1² @2 ⑂¹ (∑1 = ¶∑1)"), s.events.map((e) => e.line).join("\n"));
  assert.ok(s.events.some((e) => e.line === "⌂□⧖9000 A 1² › B 2¹ @1 (∑1 = ¶∑1)"));
});

test("새 세상과 그 포크 — 지도를 세상으로 나누고, 그 세상은 따로 읽어요 (원리 1 2-3 · 12-18 ③ · 예전에는 새 세상의 포크에서 멈췄어요)", () => {
  const msg = (id, role, text, t, meta = {}) => ({ id, role, parts: [{ type: "text", text }], metadata: { createdAt: t, ...meta } });
  const map = { conversations: [
    { id: "R", createdAt: 100, messages: [msg("r1", "user", "하나", 100), msg("r2", "assistant", "답", 101)] },
    // 첫 말을 고쳐 다시 시작한 흐름 — 새 세상 W
    { id: "W", createdAt: 200, line: line("R", "R", null, 0), messages: [msg("w1", "user", "다른 첫 말", 200), msg("w2", "assistant", "답", 201)] },
    // W에서 연 포크 — W의 세상
    { id: "WF", createdAt: 300, line: line("R", "W", "w2", 1), messages: [msg("w1", "user", "다른 첫 말", 200, { from: "W" }), msg("w2", "assistant", "답", 201, { from: "W" }), msg("x1", "user", "이어서", 300), msg("x2", "assistant", "네", 301)] },
    { id: "F", createdAt: 400, line: line("R", "R", "r2", 1), messages: [msg("r1", "user", "하나", 100, { from: "R" }), msg("r2", "assistant", "답", 101, { from: "R" }), msg("f1", "user", "포크", 400), msg("f2", "assistant", "네", 401)] },
  ] };
  const ws = worldsOf(map.conversations);
  assert.deepEqual(ws.map((w) => [w.root, w.conversations.map((c) => c.id)]), [["R", ["R", "F"]], ["W", ["W", "WF"]]]);
  // 처음 세상 — W와 그 포크는 빼고 알려요 · 포크 F는 B
  const one = readIeum(map);
  assert.equal(one.notes.length, 1);
  const s1 = stamp(one.world);
  assert.deepEqual(s1.findings, []);
  assert.ok(s1.events.some((e) => e.line === "⌂□⧖100 A 1² › B 2¹ @1 (∑1 = ¶∑1)"), s1.events.map((e) => e.line).join("\n"));
  // 새 세상 — 열쇠는 그 첫 말 · 처음 흐름은 A · 그 포크는 B
  const two = readIeum({ ...map, root: "W" });
  const s2 = stamp(two.world);
  assert.deepEqual(s2.findings, []);
  assert.ok(s2.events.some((e) => e.line === "⌂□⧖200 A 1¹ @1 (∑1 = ¶∑1)"), s2.events.map((e) => e.line).join("\n"));
  assert.ok(s2.events.some((e) => e.line === "⌂□⧖200 A 1² › B 2¹ @1 (∑1 = ¶∑1)"));
});

test("머리만 있어도 세상과 차례를 셀 수 있어요 — 목록의 요약(서브의 보낸 턴 · 넘겨주기) · 같은 때면 옛 글자의 차례 (흐름 글자 #178)", () => {
  const heads = [
    { id: "R", createdAt: 100 },
    { id: "S", createdAt: 300, line: line("R", "R", "r2", 0), sum: { subAt: 1 } },
    { id: "Z", createdAt: 300, line: line("R", "R", "r2", 0), letter: "B", sum: { subAt: 1 } },
    { id: "Y", createdAt: 300, line: line("R", "R", "r2", 0), letter: "C", sum: { subAt: 1 } },
    { id: "N", createdAt: 400, line: line("R", "R", null, 0) },
    { id: "H", createdAt: 500, line: line("R", "R", null, 0), sum: { hand: { ctx: "none", at: 0 } } },
  ];
  assert.equal(opensWorld(heads[0]), true);
  assert.equal(opensWorld(heads[1]), false);
  assert.equal(opensWorld(heads[4]), true);
  assert.equal(opensWorld(heads[5]), false);
  const ws = worldsOf(heads);
  assert.deepEqual(ws.map((w) => w.root), ["R", "N"]);
  // 같은 때(300)에 태어난 서브 셋 — 옛 글자 B · C가 먼저, 글자가 없는 것은 그 뒤
  assert.deepEqual(flowOrder(ws[0].conversations, "R").map((c) => c.id), ["R", "Z", "Y", "S", "H"]);
});

test("창이 들고 있는 질문(때가 없음)은 바로 뒤 답이 만들어진 때로 — 꼬리표의 때가 0이 되지 않게 (첫 화면에서 찾음)", () => {
  const map = { conversations: [{ id: "R", createdAt: 5000, messages: [
    { id: "q1", role: "user", parts: [{ type: "text", text: "하나" }] },
    { id: "a1", role: "assistant", parts: [{ type: "text", text: "답" }], metadata: { createdAt: 6000 } },
    { id: "q2", role: "user", parts: [{ type: "text", text: "둘" }] },
    { id: "a2", role: "assistant", parts: [{ type: "text", text: "답" }], metadata: { createdAt: 9000 } },
  ] }] };
  const s = stamp(readIeum(map).world);
  assert.deepEqual(s.findings, []);
  // 답은 질문 바로 뒤(1/100 밀리초 — 흐름 안의 차례를 지키는 것)
  assert.deepEqual(s.events.map((e) => [e.turn, e.sup, Math.round(e.t0)]), [[1, 1, 6000], [1, 2, 6000], [2, 1, 9000], [2, 2, 9000]]);
});

test("글 없이 붙임만 보낸 질문도 턴을 열어요 — 그 뒤의 턴이 하나씩 밀리지 않게 (첫 화면 검토 #2)", () => {
  const msg = (id, role, parts, meta = {}) => ({ id, role, parts, metadata: meta });
  const T = (s) => [{ type: "text", text: s }];
  const map = { conversations: [{ id: "R", createdAt: 100, messages: [
    msg("q1", "user", T("하나")), msg("a1", "assistant", T("답"), { createdAt: 101 }),
    msg("q2", "user", [{ type: "file", mediaType: "image/png", url: "x" }]), msg("a2", "assistant", T("그림 답"), { createdAt: 102 }),
    msg("q3", "user", [{ type: "data-attachment", data: { kind: "line", name: "B" } }]), msg("a3", "assistant", T("결과 답"), { createdAt: 103 }),
  ] }] };
  const s = stamp(readIeum(map).world);
  assert.deepEqual(s.findings, []);
  assert.deepEqual(s.events.map((e) => `${e.turn}.${e.sup}`), ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2"]);
  // 붙인 그림은 그 말 사건 안의 ⇣ · 다른 흐름의 결과는 읽는 답의 첫 안쪽 ⇣ (12-10)
  assert.ok(s.places.some((p) => p.line.endsWith("A 2¹₂ ⇣")), s.places.map((p) => p.line).join("\n"));
  assert.ok(s.places.some((p) => p.line.endsWith("A 3²₁ ⇣")));
});

test("부모 흐름이 지워진 포크 — 흐름은 모름 □이지만 태어난 턴에서 이어요 (첫 화면 검토 #8)", () => {
  const msg = (id, role, text, meta = {}) => ({ id, role, parts: [{ type: "text", text }], metadata: meta });
  const map = { conversations: [
    { id: "R", createdAt: 100, messages: [msg("r1", "user", "하나"), msg("r2", "assistant", "답", { createdAt: 101 })] },
    { id: "F", createdAt: 300, line: line("R", "GONE", "x2", 4), messages: [msg("f1", "user", "이어서"), msg("f2", "assistant", "네", { createdAt: 301 })] },
  ] };
  const s = stamp(readIeum(map).world);
  assert.ok(s.findings.some((f) => f.code === "두 끝"));
  assert.ok(s.events.some((e) => e.line === "⌂□⧖100 □ 4 › B 5¹ @1 (∑1 = ¶∑1)"), s.events.map((e) => e.line).join("\n"));
});

test("앱이 지도 안의 이름을 주면 흐름 글자는 그것 — 새 세상도 지도 안에서 겹치지 않게 (첫 화면 검토 #3 · #9)", () => {
  const msg = (id, role, text, t, meta = {}) => ({ id, role, parts: [{ type: "text", text }], metadata: { createdAt: t, ...meta } });
  const conversations = [
    { id: "R", createdAt: 100, messages: [msg("r1", "user", "하나", 100), msg("r2", "assistant", "답", 101)] },
    { id: "W", createdAt: 200, line: line("R", "R", null, 0), messages: [msg("w1", "user", "다른 첫 말", 200), msg("w2", "assistant", "답", 201)] },
    { id: "WF", createdAt: 300, line: line("R", "W", "w2", 1), messages: [msg("w1", "user", "다른 첫 말", 200, { from: "W" }), msg("w2", "assistant", "답", 201, { from: "W" }), msg("x1", "user", "이어서", 300), msg("x2", "assistant", "네", 301)] },
  ];
  const s = stamp(readIeum({ conversations, root: "W", letters: new Map([["R", "A"], ["W", "B"], ["WF", "C"]]) }).world);
  assert.deepEqual(s.findings, []);
  assert.ok(s.events.some((e) => e.line === "⌂□⧖200 B 1¹ @1 (∑1 = ¶∑1)"), s.events.map((e) => e.line).join("\n"));
  assert.ok(s.events.some((e) => e.line === "⌂□⧖200 B 1² › C 2¹ @1 (∑1 = ¶∑1)"));
});

test("다시 정리하며 보낸 서브는 그 정리한 답의 sub_tidy 부름에서 태어나요 — 약속(합류)은 처음 보낸 부름 그대로 (자동 점검 subsTidy에서 찾음)", () => {
  const msg = (id, role, parts, meta = {}) => ({ id, role, parts, metadata: meta });
  const T = (s) => ({ type: "text", text: s });
  const call = (name, id, output) => ({ type: `tool-${name}`, toolCallId: id, state: "output-available", input: {}, output });
  const map = { conversations: [
    { id: "R", createdAt: 100, messages: [
      msg("r1", "user", [T("보내 줘")]), msg("r2", "assistant", [{ type: "step-start" }, call("sub_send", "c1", { ok: true, subs: [{ id: "S1" }] }), T("보냈어요")], { createdAt: 101 }),
      msg("r3", "user", [T("다시 정리해 줘")]), msg("r4", "assistant", [{ type: "step-start" }, call("sub_tidy", "c9", { ok: true, subs: [{ id: "S2" }] }), T("정리했어요")], { createdAt: 300 }),
    ] },
    { id: "S1", createdAt: 150, line: line("R", "R", "r2", 0), messages: [msg("s1", "user", [T("맡은 일 하나")], { by: "R", sub: { call: "c1", at: 1, i: 1, of: 1 } }), msg("s2", "assistant", [T("끝")], { createdAt: 151 })] },
    { id: "S2", createdAt: 350, line: line("R", "R", "r4", 0), messages: [msg("t1", "user", [T("맡은 일 둘")], { by: "R", sub: { call: "c1", at: 2, i: 2, of: 2, instead: "S1" } }), msg("t2", "assistant", [T("끝")], { createdAt: 351 })] },
  ] };
  const s = stamp(readIeum(map).world);
  assert.deepEqual(s.findings, []);
  assert.ok(s.events.some((e) => e.line === "⌂□⧖100 A 1²₁ › B 2¹ @2 (∑1 = ¶∑1)"), s.events.map((e) => e.line).join("\n"));
  assert.ok(s.events.some((e) => e.line === "⌂□⧖100 A 2²₁ › C 3¹ @2 (∑1 = ¶∑1)"));
});

test("에이전트 OS가 바뀌면 사용자의 말 사건에 ∆ @그 에이전트 — 이름 · 버전 (v0.9.95 · 처음 보는 OS와 그대로인 OS는 ∆ 없음)", () => {
  const os = (id, name, v) => ({ os: { id, name, v } });
  const map = {
    conversations: [
      {
        id: "R", createdAt: 1000, partner: { name: "하루" },
        messages: [u("m1", 1000, "하나"), a("m2", 1001, [{ type: "text", text: "네" }], os("orig", "이음 오리지널", "0.9.95")), u("m3", 2000, "둘"), a("m4", 2001, [{ type: "text", text: "네" }], os("os-1", "하루 OS", "1.0")), u("m5", 3000, "셋"), a("m6", 3001, [{ type: "text", text: "네" }], os("os-1", "하루 OS", "1.0"))],
      },
    ],
  };
  const s = stamp(readIeum(map).world);
  assert.deepEqual(s.findings, []);
  const ch = s.events.filter((e) => (e.marks ?? []).some((m) => m.sym === "∆" && m.key === "에이전트 OS"));
  assert.equal(ch.length, 1);
  assert.ok(ch[0].line.endsWith("A 2¹ @1 ∆¹ @2 (∑1 = ¶∑1)"), ch[0].line);
  const m = ch[0].marks.find((x) => x.key === "에이전트 OS");
  assert.equal(m.before, "이음 오리지널 0.9.95");
  assert.equal(m.value, "하루 OS 1.0");
});
