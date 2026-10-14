// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 좌표의 법칙 — 실제 기록 시험: 이 세션(클로드 코드)의 기록 두 토막 (72-reports/03과 같은 토막 · 글 내용 없음)
// 사람 셋이 따로 좌표를 써 보던 것(03)을, 이제는 코드가 매겨요. 핵심 줄은 손으로 확인한 답, 나머지는 그대로 남긴 답(real-record.expected.txt)과 글자까지.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stamp } from "../src/coord/stamp.mjs";
import { lintLine, passes } from "../src/coord/lint.mjs";
import { renderStamp } from "../src/coord/render.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const world = JSON.parse(readFileSync(here("./fixtures/real-record.json"), "utf8"));
const r = stamp(world);
const all = [...r.places, ...r.events, ...r.turns, ...r.flows, ...r.beings, ...r.toggles].map((x) => x.line);
const has = (line) => all.includes(line);

test("기록 347줄이 모두 한 번씩 다뤄지고, 점검에 걸린 것이 없어요", () => {
  assert.equal(world.items.length, 347);
  assert.deepEqual(r.findings, []);
  assert.equal(r.account.size, world.items.length);
  for (const l of all) assert.ok(passes(lintLine(l, { stored: true })), l);
});

test("손으로 확인한 핵심 줄 — 규칙마다", () => {
  // 원리 1: 기준(사용자 @1)의 말이 턴을 열어요 · 모르는 세상 · 흐름 글자는 □ (#169)
  assert.ok(has("⌂□⧖□ □ 149¹ @1 (∑1 = ¶∑1)"));
  // #169 ④ 알림 줄은 그것을 읽는 사건(에이전트의 답)의 첫 안쪽
  assert.ok(has("⌂□⧖□ □ 149²₁ ⇣"));
  // #169 ③ 워크플로를 보낸 부름과 바로 온 결과는 ⚒ 한 자리 · 옆으로 나간 서브 넷 (12-3)
  assert.ok(has("⌂□⧖□ □ 149²₅ ⚒ ⑂¹ ⑂² ⑂³ ⑂⁴"));
  // #160 깨우는 것은 약속 — 돌려줌이 닿아 같은 턴의 셋째 사건 · 첫 안쪽 ⇣ · 두 끝
  const back = r.places.find((p) => p.line === "⌂□⧖□ □ 149³₁ ⇣");
  assert.ok(back);
  assert.equal(back.link, "⌂□⧖□ □ 149²₅");
  assert.ok(has("⌂□⧖□ □ 149 (∑3)"));
  // 원리 1: 포크로 난 흐름은 그 사건(#153의 답)의 다음 턴부터 · 지나온 길까지 (12-11)
  assert.ok(has("⌂□⧖□ □ 153² › □ 154¹ @1 (∑1 = ¶∑1)"));
  // #171 ⑩ 입력창에 친 /compact는 대화 밖의 일 · 대상은 그때의 자리
  const out = r.beings.find((b) => b.label === "/compact");
  assert.equal(out.line, "@⌂□⧖□ ⚒¹");
  assert.equal(out.targetLine, "⌂□⧖□ □ 153² › □ 154²");
  // #164 · #170 ⑤ 압축 요약 = 지은 토글(층 · 앞 끝은 모름) + 다음 답의 ∆(교체)
  assert.ok(has("⌂□⧖□ ▸□⧖1791797239094 □ □ ~ □ 153² › □ 154²"));
  assert.ok(has("⌂□⧖□ □ 153² › □ 155² @□ ∆¹ @□ (∑52 = ∴∑11 + ¶∑2 + ⚒∑18 + ⇣∑21)"));
  // #169 ② 답 도중에 앞(맨 위 지시)이 바뀌면 그 안쪽 자리에 ∆ — 시험(03)에서 사람들이 갈린 바로 그곳
  assert.ok(has("⌂□⧖□ □ 153² › □ 155²₄ ⚒ ∆¹ @□"));
  // #165 이름 바꾸기 한 번 = 흐름의 이름 ∆ + 에이전트 이름 ∆ — 그 부름의 자리에
  assert.ok(has("⌂□⧖□ □ 153² › □ 156²₅ ⚒ ∆¹ ∆² @□"));
  // #170 ⑦ 포크로 난 흐름의 총 양은 그 흐름이 가진 턴 수 · 앞이 기록에 없는 흐름은 모름
  assert.ok(has("⌂□⧖□ □ 153² › □ (∑3)"));
  assert.ok(has("⌂□⧖□ □ (∑□)"));
});

test("나머지 줄도 남긴 답과 글자까지 같아요 (real-record.expected.txt)", () => {
  const text = renderStamp(r);
  const file = here("./fixtures/real-record.expected.txt");
  if (!existsSync(file) || process.env.COORD_WRITE_EXPECTED) writeFileSync(file, text);
  assert.equal(text, readFileSync(file, "utf8"));
});

test("압축 경계 토글(L2049) 및 115개 모든 정준 좌표 자리의 원본 역참조(Return Address) 100% 매핑 검증", () => {
  // 압축 경계(compact_boundary, L2049)가 정준 토글 좌표로 정확히 기록되는지 확인
  const toggleCoord = "⌂□⧖□ ▸□⧖1791797239094 □ □ ~ □ 153² › □ 154²";
  assert.ok(has(toggleCoord));

  // 모든 정준 좌표 자리(115개)가 원본 기록(real-record.json)의 항목 ID로 빈틈없이 역참조되는지 검증
  const rawIds = new Set(world.items.map((it) => it.id));
  assert.equal(r.places.length, 115);
  for (const place of r.places) {
    assert.ok(Array.isArray(place.items) && place.items.length > 0, `Empty items for ${place.line}`);
    for (const refId of place.items) {
      const baseId = refId.split(".")[0];
      assert.ok(rawIds.has(baseId), `Unresolvable return address ${refId} at ${place.line}`);
    }
  }
});


