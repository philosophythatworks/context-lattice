// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 옛 기록 읽기 — 클로드 코드의 대화 기록(jsonl)을 좌표의 법칙이 읽는 꼴(Item)로 (12-17 · 좌표 #164 · #169 · #170 · #171)
// 클로드 코드는 그곳의 법칙대로 기록해요(12-1). 여기서는 그 기록 줄마다 "우리 세상에서 무엇인가"를 고정된 표로 정해요.
// 글의 내용은 들고 오지 않아요 — 때 · 누가 · 무엇 · 짝(부름) · 걸음만. 그래서 시험 자료에 대화의 글이 남지 않아요.

import { createHash } from "node:crypto";

/** 앱이 붙인 것(attachment) — 창에 새로 든 알림 줄이면 notice, 미리 있는 것이면 preset (좌표 #169) */
const ATTACHMENT = {
  total_tokens_reminder: "notice",
  silent_turn_reminder: "notice",
  read_truncation_notice: "notice",
  compact_file_reference: "preset",
  file: "preset",
  deferred_tools_record: "preset",
  deferred_tools_delta: "preset",
  agent_listing_delta: "preset",
  mcp_instructions_delta: "preset",
  environment: "preset",
  instructions: "preset",
  prompt_snapshot: "preset",
  model: "preset",
  session_context: "preset",
  date: "preset",
  credential_org: "preset",
  remote_session_change: "preset",
  auto_mode: "preset",
};

/** 앱 자체의 기록 — 창에 들지 않아요 (좌표 밖 · 코드의 일) */
const QUIET = new Set(["queue-operation", "last-prompt", "mode", "atis-latch", "history-suppression", "file-history-snapshot", "file-history-delta"]);

const hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 12);
const msOf = (ts) => (ts ? Date.parse(ts) : NaN);

/**
 * 기록 줄들 → Item[]
 * @param {{ line: number, rec: any }[]} rows 기록 줄(번호와 함께)
 * @param {{ flowOf: (line: number) => string, user: string, agentOf: (flow: string) => string, subsOf?: (call: string, name: string) => number }} cfg
 */
export function readClaudeCode(rows, cfg) {
  /** @type {import("../stamp.mjs").Item[]} */
  const items = [];
  let lastT = 0;
  for (const { line, rec } of rows) {
    const flow = cfg.flowOf(line);
    const agent = cfg.agentOf(flow);
    const t = msOf(rec.timestamp);
    const t0 = Number.isFinite(t) ? t : lastT; // 이름 기록처럼 때가 없는 줄은 바로 앞 줄의 때
    if (Number.isFinite(t)) lastT = t;
    const base = { flow, t0 };
    const id = `L${line}`;
    const type = rec.type;
    if (QUIET.has(type)) {
      items.push({ ...base, id, what: "quiet", label: type });
    } else if (type === "custom-title" || type === "agent-name") {
      // 이름 — 같은 값을 다시 적으면 바뀐 것이 아니에요(12-6). 클로드 코드의 이름 바꾸기 한 번은 흐름의 이름 · 에이전트 이름 둘의 ∆ (좌표 #165)
      const value = rec.customTitle ?? rec.agentName;
      items.push({ ...base, id, what: "change", key: type === "custom-title" ? "흐름 이름" : "에이전트 이름", value, ...(type === "agent-name" ? { about: agent } : {}), label: "이름" });
    } else if (type === "attachment") {
      const a = rec.attachment ?? {};
      const kind = ATTACHMENT[a.type] ?? "other";
      // 미리 있는 것은 그 흐름의 에이전트가 읽는 창의 것 — 값이 바뀌면 그 에이전트의 ∆ (좌표 #169)
      // 파일처럼 같은 종류가 여럿이면 하나하나가 따로 된 것 — 이름(파일)까지가 열쇠
      if (kind === "preset") items.push({ ...base, id, what: "preset", key: a.filename ? `${a.type}:${a.filename}` : a.type, value: hash({ ...a, type: undefined }), about: agent, label: a.type });
      else items.push({ ...base, id, what: kind, label: a.type });
    } else if (type === "system") {
      if (rec.subtype === "stop_hook_summary") items.push({ ...base, id, what: "stop", who: agent });
      else items.push({ ...base, id, what: "quiet", label: rec.subtype });
    } else if (type === "user") {
      const c = rec.message?.content;
      const parts = typeof c === "string" ? [{ type: "text", text: c }] : (c ?? []);
      parts.forEach((p, k) => {
        const pid = parts.length > 1 ? `${id}.${k}` : id;
        if (p.type === "tool_result") items.push({ ...base, id: pid, what: "result", call: p.tool_use_id, label: "도구 결과" });
        else if (p.type === "text") {
          const s = p.text ?? "";
          if (s.startsWith("<task-notification>")) {
            const call = /<tool-use-id>([^<]+)<\/tool-use-id>/.exec(s)?.[1];
            items.push({ ...base, id: pid, what: "arrive", call, label: "서브의 돌려줌" });
          } else if (s.startsWith("This session is being continued")) items.push({ ...base, id: pid, what: "swap", label: "압축 요약(교체)" });
          else if (s.startsWith("<command-name>")) items.push({ ...base, id: pid, what: "outside", who: cfg.user, label: /<command-name>([^<]+)/.exec(s)?.[1] ?? "명령" });
          else if (s.startsWith("<local-command-")) items.push({ ...base, id: pid, what: "quiet", label: "명령의 앞뒤 글" });
          else items.push({ ...base, id: pid, what: "speak", who: cfg.user, label: "말" });
        } else items.push({ ...base, id: pid, what: "other", label: p.type });
      });
    } else if (type === "assistant") {
      const step = rec.message?.id ?? rec.requestId;
      (rec.message?.content ?? []).forEach((p, k, all) => {
        const pid = all.length > 1 ? `${id}.${k}` : id;
        if (p.type === "thinking") items.push({ ...base, id: pid, what: "think", who: agent, step, label: "생각" });
        else if (p.type === "text") items.push({ ...base, id: pid, what: "speak", who: agent, step, label: "말" });
        else if (p.type === "tool_use") items.push({ ...base, id: pid, what: "call", who: agent, step, call: p.id, subs: cfg.subsOf?.(p.id, p.name) ?? 0, label: p.name });
        else items.push({ ...base, id: pid, what: "other", who: agent, step, label: p.type });
      });
    } else items.push({ ...base, id, what: "other", label: type });
  }
  // 클로드 코드는 이름을 바꾸는 도구의 부름보다 이름 기록을 먼저 적어요 — 바로 뒤에 오는 그 부름의 일로 읽어요(기록의 차례 ≠ 일어난 차례)
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.what !== "change") continue;
    const next = items.slice(k + 1, k + 6).find((x) => x.what === "call" && /set_session_title|rename/i.test(x.label ?? ""));
    if (next) it.call = next.call;
  }
  return items;
}
