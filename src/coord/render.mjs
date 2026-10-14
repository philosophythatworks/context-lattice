// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 좌표의 법칙 — 매긴 것을 한 장의 글로 (기록 · 시험 · 보기에서 같은 글자로 쓰려고)
// 사건마다: 사건 줄, 그 아래 안쪽 자리들(두 끝이 있으면 ↔). 그다음 턴 · 흐름의 총 양, 대화 밖의 일, 지은 토글.

/** @param {ReturnType<import("./stamp.mjs").stamp>} r */
export function renderStamp(r) {
  const out = [];
  for (const ev of r.events) {
    out.push(ev.line);
    for (const p of r.places.filter((x) => x.event === ev)) out.push(`  ${p.line}${p.link ? `  ↔ ${p.link}` : ""}`);
  }
  out.push("", "# 턴", ...r.turns.map((t) => t.line));
  out.push("", "# 흐름", ...r.flows.map((f) => f.line));
  if (r.beings.length) out.push("", "# 대화 밖의 일", ...r.beings.map((b) => `${b.line}${b.targetLine ? `  → ${b.targetLine}` : ""}`));
  if (r.toggles.length) out.push("", "# 지은 토글", ...r.toggles.map((t) => t.line));
  return out.join("\n") + "\n";
}
