// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 이음의 기록 읽기 — 이음 금고의 대화 지도 하나(처음 흐름 + 그 포크 · 서브)를 좌표의 법칙이 읽는 꼴(World)로
// 앱이 이미 들고 있는 모양(Conversation — 머리 + 메시지)을 그대로 받아요. 금고를 직접 열지 않아요(아빠 데이터는 건드리지 않음).
// 정해진 것: 물려받은 글(metadata.from)은 주인 흐름의 것이라 읽지 않아요(12-11) · 흐름 글자와 턴은 태어난 차례대로 다시 매겨요(좌표 #171)
//   · 서브와 예니가 연 포크는 그것을 보낸 부름의 자리에서 태어나요(12-3 · 좌표 #170) · 합류는 약속을 지키는 돌려줌(좌표 #160).

import { UNKNOWN } from "../notation.mjs";

/** 도구 이름 — 보내는 일(✉)과 의도를 적는 일 (server/hands/names.ts) */
const SENDS = new Set(["line_return", "line_bring"]);
const INTENT = "intent_set";

const own = (c) => (c.messages ?? []).filter((m) => !m.metadata?.from);
const firstOwnUser = (c) => own(c).find((m) => m.role === "user");

/** v0.9.90의 앱이 적어 두던 흐름 글자(M을 건너뜀)의 차례 — 같은 때에 태어난 흐름의 차례를 가르는 데만 써요(없으면 맨 뒤) */
const OLD_LETTERS = "ABCDEFGHIJKLNOPQRSTUVWXYZ";
function oldRank(s) {
  const m = typeof s === "string" ? /^([A-Z])([0-9]*)$/.exec(s) : null;
  const base = m ? OLD_LETTERS.indexOf(m[1]) : -1;
  if (base < 0) return Infinity;
  return m[2] ? (Number(m[2]) - 1) * OLD_LETTERS.length + base : base;
}
/** 태어난 차례 — 만든 때 → (같은 때면) 옛 글자의 차례 → 번호. 창과 서버가 같은 차례로 세요(흐름 글자 — 좌표 #171 · #178) */
export function byBirth(a, b) {
  return a.createdAt - b.createdAt || oldRank(a.letter) - oldRank(b.letter) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * 첫 자기 질문의 꼬리표 — 누가 · 어떻게 연 흐름인가 (서브 · 예니가 연 포크 · 넘겨주기/요약).
 * 글을 받았으면 글에서, 머리만 있으면 목록의 요약(`sum`)과 새 자리의 고름(`hand`)에서 읽어요.
 */
function birthTags(c) {
  if (c.messages?.length) {
    const f = firstOwnUser(c)?.metadata ?? {};
    return { sub: !!f.sub, branch: !!f.branch, hand: !!f.hand };
  }
  return { sub: c.sum?.subAt !== undefined || c.sum?.subNo !== undefined, branch: !!c.sum?.aiBy, hand: !!(c.hand ?? c.sum?.hand) };
}

/** 세상을 여는 흐름인가 — 처음 흐름, 그리고 빈 시작 자리에서 사람이 연 흐름(포크가 아니라 새 세상 — 원리 1 2-3 · 12-18 ③) */
export function opensWorld(c) {
  if (!c.line) return true;
  if (c.line.origin.turn !== 0 || c.line.origin.msg) return false;
  const t = birthTags(c);
  return !t.sub && !t.branch && !t.hand;
}

/**
 * 앱의 대화 지도 하나 → 세상들. 지도에는 빈 시작 자리에서 연 흐름(새 세상)과 그 포크들도 함께 들어 있어요.
 * 처음 세상(뿌리)이 먼저, 그다음 세상들은 그 세상의 처음 흐름이 태어난 차례로. 부모가 지도에 없는 흐름은 처음 세상에 두어요(읽을 때 알려요).
 * @template {{ id: string, createdAt: number, line?: { origin: { line: string, msg: string|null, turn: number } } }} C
 * @param {C[]} conversations
 * @returns {{ root: string, conversations: C[] }[]}
 */
export function worldsOf(conversations) {
  if (!conversations.length) return [];
  const byId = new Map(conversations.map((c) => [c.id, c]));
  const sorted = [...conversations].sort(byBirth);
  const main = sorted.find((c) => !c.line) ?? sorted[0];
  const topOf = (c) => {
    const seen = new Set();
    for (let cur = c; ; ) {
      if (cur === main || opensWorld(cur)) return cur.id;
      if (seen.has(cur.id)) return main.id;
      seen.add(cur.id);
      const p = byId.get(cur.line.origin.line);
      if (!p) return main.id;
      cur = p;
    }
  };
  const groups = new Map();
  for (const c of sorted) {
    const top = topOf(c);
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(c);
  }
  const roots = [...groups.keys()].map((id) => byId.get(id)).sort((a, b) => (a === main ? -1 : b === main ? 1 : byBirth(a, b)));
  return roots.map((r) => ({ root: r.id, conversations: groups.get(r.id) }));
}

/**
 * 한 세상의 흐름들을 태어난 차례로 — 부모가 늘 먼저(포크는 그것이 태어난 흐름보다 먼저 올 수 없어요 · 금고의 만든 때가 거꾸로여도).
 * 부모가 놓인 흐름 가운데 먼저 태어난 것부터. 흐름 글자도 이 차례로 매겨요(좌표 #171).
 * @template {{ id: string, createdAt: number, line?: { origin: { line: string } } }} C
 * @param {C[]} conversations 한 세상의 흐름들
 * @param {string} [rootId] 그 세상의 처음 흐름
 * @returns {C[]}
 */
export function flowOrder(conversations, rootId) {
  if (!conversations.length) return [];
  const byTime = [...conversations].sort(byBirth);
  const root = byTime.find((c) => c.id === rootId) ?? byTime.find((c) => !c.line) ?? byTime[0];
  const out = [root];
  const placed = new Set([root.id]);
  for (let left = byTime.filter((c) => c !== root); left.length; ) {
    const next = left.find((c) => c.line && placed.has(c.line.origin.line)) ?? left[0];
    out.push(next);
    placed.add(next.id);
    left = left.filter((c) => c !== next);
  }
  return out;
}

/**
 * @param {{ conversations: any[], root?: string, user?: { name?: string }, letters?: Map<string, string> | Record<string, string> }} map 대화 지도 하나 — 처음 흐름과 그 갈래들(메시지까지 받은 것).
 *   `root`를 주면 그 흐름이 여는 세상을 읽어요(빈 시작 자리에서 연 흐름 — 새 세상). 없으면 처음 세상.
 *   `letters`를 주면 흐름 글자는 그것(앱의 지도 안 이름 — 처음 세상에서는 태어난 차례와 같고, 아직 저장 전인 서브까지 센 것) · 없으면 태어난 차례.
 * @returns {{ world: import("../stamp.mjs").World, notes: string[] }}
 */
export function readIeum(map) {
  const notes = [];
  // 빈 시작 자리에서 연 흐름은 포크가 아니라 새 세상이에요(원리 1 2-3) — 그 세상(그 흐름과 그 포크들)은 이 세상에서 빼고 알려요
  const worlds = worldsOf(map.conversations);
  const here = (map.root && worlds.find((w) => w.root === map.root)) || worlds[0];
  for (const w of worlds) {
    if (w !== here) notes.push(`${w.root}: 빈 시작 자리에서 연 흐름 — 다른 세상으로 읽어야 해요(원리 1 2-3)${w.conversations.length > 1 ? ` · 그 세상의 흐름 ${w.conversations.length}` : ""}`);
  }
  const flowsIn = flowOrder(here?.conversations ?? [], here?.root);
  const byIdIn = new Map(flowsIn.map((c) => [c.id, c]));
  const root = flowsIn[0];
  const inWorld = new Set(flowsIn.map((c) => c.id));
  for (const c of flowsIn) if (c !== root && c.line && !inWorld.has(c.line.origin.line)) notes.push(`${c.id}: 부모 흐름 ${c.line.origin.line}이 이 지도에 없어요`);

  const firstMsg = own(root).find((m) => m.role === "user");
  // 세상의 열쇠 = 첫 말을 보낸 때(원리 1) — 보낸 때는 바로 뒤 답이 만들어진 때와 같은 규칙으로(아래 "때")
  const rootOwn = own(root);
  const fi = firstMsg ? rootOwn.indexOf(firstMsg) : -1;
  let born0 = firstMsg ? (firstMsg.metadata?.createdAt ?? firstMsg.createdAt ?? root.createdAt) : root.createdAt;
  const after0 = fi >= 0 ? rootOwn[fi + 1] : undefined;
  if (after0?.role === "assistant" && typeof after0.metadata?.createdAt === "number") born0 = Math.min(born0, after0.metadata.createdAt);
  const worldKey = String(born0);

  // 참여자 — 사용자 @1 · 처음 흐름의 대화 상대 @2 · 포크로 데려간 대화 상대와 서브는 저마다 새 존재(원리 1 — 복사하면 둘)
  const people = [{ id: "user", n: "1", name: map.user?.name ?? "사용자", keyCells: { house: UNKNOWN, times: [UNKNOWN] } }];
  const agentOf = new Map();
  let n = 1;
  for (const c of flowsIn) {
    const id = `agent:${c.id}`;
    agentOf.set(c.id, id);
    const born = c === root ? worldKey : String(c.createdAt);
    people.push({ id, n: String(++n), name: c.partner?.name ?? root.partner?.name ?? "이음", agent: true, keyCells: { house: UNKNOWN, times: [worldKey, born] } });
  }

  const flows = [];
  const items = [];
  /** 주인 흐름의 메시지 → 읽은 때 · 부름 → 그 부름이 든 메시지 (포크가 태어난 답 뒤에 오게) */
  const msgTime = new Map();
  const callMsg = new Map();
  for (const c of flowsIn) {
    const first = firstOwnUser(c)?.metadata ?? {};
    // 흐름의 기준 — 사람이 연 흐름은 사용자, 예니가 연 흐름(서브 · 예니가 만든 갈래)은 보낸 쪽의 대화 상대(1-6 사용자 자리)
    const senderLine = first.sub || first.branch ? c.line?.origin.line : undefined;
    const base = senderLine ? (agentOf.get(senderLine) ?? "user") : "user";
    // 흐름 글자 — 앱이 지도 안의 이름을 주면 그대로(지도 안에서 이름이 겹치지 않게 · 아직 저장 전인 서브까지 센 이름 — 첫 화면 검토 #3 · #9), 없으면 태어난 차례
    const letter = map.letters ? (map.letters instanceof Map ? map.letters.get(c.id) : map.letters[c.id]) : undefined;
    flows.push({ id: c.id, base, ...(letter ? { letter } : {}) });
    const mine = own(c);
    // 포크는 늘 태어난 답 뒤에, 그 흐름의 말은 늘 포크 뒤에 — 금고의 때가 같거나 거꾸로여도(점검의 씨앗은 모두 같은 1/1000초) 차례는 이 규칙으로
    let prev = -Infinity;
    if (c !== root) {
      const fork = { id: `fork:${c.id}`, flow: c.id, from: c.line.origin.line, what: "fork", label: "포크" };
      if (first.sub?.call) fork.atCall = first.sub.call;
      else if (first.branch?.call) fork.atCall = first.branch.call;
      // 태어난 답 — 부름 자리를 찾지 못할 때도 그 답으로 읽어요(점검이 알려 줘요)
      if (c.line.origin.msg) fork.atMsg = c.line.origin.msg;
      // 다시 정리하며 보낸 서브 — 꼬리표의 부름은 처음 보냄(약속 · 합류는 그 부름으로)이지만, 태어난 곳은 그 정리한 답의 sub_tidy 부름이에요(자동 점검 subsTidy에서 찾음)
      if (first.sub?.call && fork.atMsg && callMsg.has(first.sub.call) && callMsg.get(first.sub.call) !== fork.atMsg) {
        const bm = (byIdIn.get(c.line.origin.line)?.messages ?? []).find((m) => m.id === fork.atMsg);
        const tidies = (bm?.parts ?? []).filter((p) => p.type === "tool-sub_tidy" && p.toolCallId);
        const hit = tidies.find((p) => JSON.stringify(p.output ?? "").includes(c.id)) ?? tidies.at(-1);
        if (hit) fork.atCall = hit.toolCallId;
        else delete fork.atCall;
      }
      // 부모 흐름이 이 지도에 없을 때(지워짐) 이어 갈 턴 — 태어난 턴(서브는 보낸 턴 · 넘겨받은 흐름은 꼬리표의 턴) (첫 화면 검토 #8)
      const bornTurn = first.sub?.at ?? (first.hand?.ctx === "none" ? first.hand.at : undefined) ?? c.line.origin.turn;
      if (typeof bornTurn === "number" && Number.isInteger(bornTurn) && bornTurn >= 0) fork.atTurn = bornTurn;
      if (!fork.atCall && !fork.atMsg) notes.push(`${c.id}: 태어난 답을 알 수 없어요`);
      const birth = (fork.atCall && callMsg.get(fork.atCall)) || fork.atMsg;
      const firstT = mine[0]?.metadata?.createdAt ?? mine[0]?.createdAt ?? c.createdAt;
      fork.t0 = Math.max(firstT - 1, (msgTime.get(birth) ?? -Infinity) + 0.5);
      items.push(fork);
      prev = fork.t0;
    }
    const agent = agentOf.get(c.id);
    // 때 — 금고의 저장 때(created_at)는 질문이 그 답보다 늦게 적힐 수 있어요(시험에서 법칙이 찾음).
    //   그래서 앱과 같은 규칙으로 읽어요: 질문을 보낸 때 = 바로 뒤 답이 만들어진 때(server/prompt.ts › stampSent) · 흐름 안의 차례는 금고의 차례(seq) 그대로
    const times = [];
    mine.forEach((m, i) => {
      const meta = m.metadata ?? {};
      let t = meta.createdAt ?? m.createdAt;
      const next = mine[i + 1];
      // 창이 들고 있는 질문에는 때가 없어요(금고의 줄에만 있음) — 그때는 바로 뒤 답이 만들어진 때가 곧 보낸 때
      if (m.role === "user" && next?.role === "assistant" && typeof next.metadata?.createdAt === "number") t = t === undefined ? next.metadata.createdAt : Math.min(t, next.metadata.createdAt);
      t = Math.max(t ?? 0, prev + 0.01);
      times.push(t);
      prev = t;
      msgTime.set(m.id, t);
      for (const p of m.parts ?? []) if (p.toolCallId) callMsg.set(p.toolCallId, m.id);
    });
    for (const [mi, m] of mine.entries()) {
      const meta = m.metadata ?? {};
      const t0 = times[mi];
      let k = 0;
      const at = () => t0 + k++ / 10000; // 한 메시지 안의 차례 (부분마다 때가 따로 남지 않아요)
      const base0 = { flow: c.id, msg: m.id };
      if (m.role === "user") {
        if (meta.join) {
          items.push({ ...base0, id: `${m.id}`, t0: at(), what: "arrive", call: meta.join.call, label: meta.join.branch ? "갈래의 돌려줌" : "서브들의 돌려줌" });
          continue;
        }
        if (meta.cont) {
          items.push({ ...base0, id: `${m.id}`, t0: at(), what: "arrive", label: "이어 가기(앱)" });
          continue;
        }
        // (좌표의 원리 3 · 바닥 — 아빠 #209 ~ #211) 아빠의 말이 아닌 질문 자리의 글 — 턴을 열지 않아요(같은 턴의 다음 사건 · 첫 안쪽 ⇣).
        //   앱이 시간 경계에서 이어 감(time) · 아빠가 단추를 누름(retry · resume · sum — 누름은 대화 밖의 일 `@1 ⚒`로 따로)
        if (meta.go) {
          const why = meta.go.why;
          if (why !== "time") items.push({ ...base0, id: `${m.id}#press`, t0: at(), what: "outside", who: "user", label: "단추 누름" });
          items.push({ ...base0, id: `${m.id}`, t0: at(), what: "arrive", label: why === "time" ? "이어 가기(앱)" : why === "sum" ? "정리 부탁(아빠가 누름)" : "이어 가기(아빠가 누름)" });
          continue;
        }
        const who = meta.by ? (agentOf.get(meta.by) ?? agentOf.get(c.line?.origin.line) ?? "user") : "user";
        if (meta.intentNow) {
          items.push({ ...base0, id: `${m.id}#intent`, t0: at(), what: "notice", label: "의도 살피기 알림" });
          if (meta.intentNow.why === "rename") items.push({ ...base0, id: `${m.id}#rename`, t0: at(), what: "change", key: "흐름 이름", value: meta.intentNow.label ?? "?", label: "이름 바꿈" });
        }
        (m.parts ?? []).forEach((p, i) => {
          if (p.type === "data-terminal") for (let j = 0; j < (p.data?.lines?.length ?? 0); j++) items.push({ ...base0, part: i, id: `${m.id}.${i}.${j}`, t0: at(), what: "outside", who: "user", label: "터미널 명령" });
        });
        // 보낸 말 — 글이 없어도(파일 · 다른 흐름의 결과만 붙여 보냄) 그 말이 턴을 열어요. 붙인 것은 그 말 사건 안의 ⇣ (좌표 #175 · 첫 화면 검토 #2)
        const texts = (m.parts ?? []).filter((p) => p.type === "text");
        const sent = texts.length > 0 || (m.parts ?? []).some((p) => p.type === "data-attachment" || p.type === "file");
        if (sent) {
          const firstPart = (m.parts ?? []).findIndex((p) => p.type === "text" || p.type === "data-attachment" || p.type === "file");
          items.push({ ...base0, part: firstPart, id: `${m.id}`, t0: at(), what: "speak", who, label: "말" });
        }
        (m.parts ?? []).forEach((p, i) => {
          if (p.type === "data-attachment") items.push({ ...base0, part: i, id: `${m.id}.${i}`, t0: at(), what: p.data?.kind === "line" ? "inbox" : "attach", who, label: p.data?.kind === "line" ? "전달받은 결과" : `붙임 ${p.data?.kind ?? ""}`.trim() });
          else if (p.type === "file") items.push({ ...base0, part: i, id: `${m.id}.${i}`, t0: at(), what: "attach", who, label: "붙임" });
        });
      } else if (m.role === "assistant") {
        // (좌표의 원리 3 · 바닥 — 흐름 B 14-2) 깨어날 때 간격 알림 — 코드가 넣은 알림 줄이라 이 답(읽는 사건)의 첫 안쪽 ⇣ (좌표 #169)
        if (typeof meta.gap === "number") items.push({ ...base0, id: `${m.id}#gap`, t0: at(), what: "notice", label: `간격 알림 ${meta.gap}일` });
        if (meta.modelId) items.push({ ...base0, id: `${m.id}#model`, t0: at(), what: "preset", key: "모델", value: meta.modelId, about: agent, label: "모델" });
        // (v0.9.95 · 에이전트 OS) 그 답을 쓸 때 읽은 OS — 이름 · 버전이 바뀌면 ∆ (처음 보는 값은 그때의 모습 · 창의 모양)
        if (meta.os?.name) items.push({ ...base0, id: `${m.id}#os`, t0: at(), what: "preset", key: "에이전트 OS", value: `${meta.os.name} ${meta.os.v ?? ""}`.trim(), about: agent, label: "에이전트 OS" });
        let step = 0;
        (m.parts ?? []).forEach((p, i) => {
          const pid = `${m.id}.${i}`;
          if (p.type === "step-start") step++;
          else if (p.type === "reasoning") items.push({ ...base0, part: i, id: pid, t0: at(), what: "think", who: agent, step: `${m.id}:${step}`, label: "생각" });
          else if (p.type === "text") items.push({ ...base0, part: i, id: pid, t0: at(), what: "speak", who: agent, step: `${m.id}:${step}`, label: "말" });
          else if (p.type?.startsWith("tool-") || p.type === "dynamic-tool") {
            const name = p.type === "dynamic-tool" ? p.toolName : p.type.slice(5);
            const call = p.toolCallId ?? pid;
            items.push({ ...base0, part: i, id: pid, t0: at(), what: "call", who: agent, step: `${m.id}:${step}`, call, sends: SENDS.has(name) ? 1 : 0, label: name });
            if (p.state?.startsWith("output")) items.push({ ...base0, part: i, id: `${pid}#result`, t0: at(), what: "result", call, label: "도구 결과" });
            if (name === INTENT && p.input?.intent) items.push({ ...base0, part: i, id: `${pid}#intent`, t0: at(), what: "change", key: "의도", value: String(p.input.intent), call, label: "의도" });
          } else items.push({ ...base0, part: i, id: pid, t0: at(), what: "other", who: agent, step: `${m.id}:${step}`, label: p.type });
        });
        items.push({ ...base0, id: `${m.id}#stop`, t0: at(), what: "stop", who: agent });
      }
    }
  }
  return {
    world: { house: UNKNOWN, key: worldKey, lettersKnown: true, people, flows, items },
    notes,
  };
}

/**
 * 금고의 줄(conversation · message 표) → 대화 지도들 — 자동 점검이 임시 금고를 읽기만 해서 넘겨요.
 * @param {{ user_id: string, id: string, title?: string, model_id?: string, created_at: number, root_id?: string|null, origin_line?: string|null, origin_msg?: string|null, origin_turn?: number|null }[]} convRows
 * @param {{ user_id: string, conversation_id: string, id: string, role: string, parts_json: string, metadata_json?: string|null, created_at: number, seq: number }[]} msgRows
 * @returns {{ conversations: any[] }[]} 지도마다(사용자 · 뿌리) 처음 흐름과 그 갈래들
 */
export function mapsFromRows(convRows, msgRows) {
  const key = (u, c) => `${u}\u0000${c}`;
  const byConv = new Map();
  for (const m of [...msgRows].sort((a, b) => a.seq - b.seq)) {
    const k = key(m.user_id, m.conversation_id);
    if (!byConv.has(k)) byConv.set(k, []);
    let parts = [];
    let metadata = {};
    try {
      parts = JSON.parse(m.parts_json);
    } catch {}
    try {
      metadata = m.metadata_json ? JSON.parse(m.metadata_json) : {};
    } catch {}
    byConv.get(k).push({ id: m.id, role: m.role, parts, metadata: { createdAt: m.created_at, ...metadata } });
  }
  const maps = new Map();
  for (const c of convRows) {
    const root = c.root_id || c.id;
    const k = key(c.user_id, root);
    if (!maps.has(k)) maps.set(k, []);
    const line = c.origin_line ? { root: c.root_id, origin: { line: c.origin_line, msg: c.origin_msg ?? null, turn: c.origin_turn ?? 0 } } : undefined;
    maps.get(k).push({ id: c.id, title: c.title, modelId: c.model_id, createdAt: c.created_at, ...(line ? { line } : {}), messages: byConv.get(key(c.user_id, c.id)) ?? [] });
  }
  return [...maps.values()].filter((cs) => cs.some((c) => c.messages.length)).map((conversations) => ({ conversations }));
}
