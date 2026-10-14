// SPDX-FileCopyrightText: 2026 Hwang Dae Jin (Philosophy That Works)
// SPDX-License-Identifier: AGPL-3.0-only

// 좌표의 법칙 — 매기기 (원리 1 · 2 · 3 · 아빠 #158 "좌표의 원리가 코드로 법칙처럼")
// 원본 기록(일어난 그대로의 줄들)을 읽어, 모든 자리에 좌표를 코드가 늘 같게 매겨요(12-18 ④).
// 판단이 끼어들 곳은 없어요 — 무엇이 자리를 받는지는 아래 목록(WHAT)으로 고정이에요(12-9 · 좌표 #169).

import { formatLine, letterOf, UNKNOWN } from "./notation.mjs";
import { lintSum } from "./lint.mjs";

/**
 * 원본 기록의 한 줄 — 법칙이 읽는 꼴.
 * @typedef {Object} Item
 * @property {string} id
 * @property {number} t0 시작(유닉스 1/1000초)
 * @property {string} flow 어느 흐름에서 (흐름 id)
 * @property {string} [who] 누가 (참여자 id)
 * @property {keyof typeof WHAT} what 무엇
 * @property {string} [call] 도구 부름의 짝(call · result · arrive)
 * @property {string} [step] 한 번에 낸 걸음(같은 걸음의 부름과 바로 온 결과는 ⚒ 한 자리 — 좌표 #169)
 * @property {number} [subs] 부름이 옆으로 보낸 서브의 수(⑂)
 * @property {string} [key] 미리 있는 것 · 바뀜의 이름(모드 · 흐름 이름 · 에이전트 이름 …)
 * @property {string} [value] 그 값
 * @property {string} [about] 바뀜이 누구의 것인가(참여자 id — 없으면 흐름의 것)
 * @property {string} [label] 꼬리표 "무엇"에 붙는 사람이 읽는 값
 */

/** 무엇 → 법칙이 하는 일 (고정 목록 — 12-9 · 좌표 #169) */
export const WHAT = {
  speak: "말 — 기준이면 턴을 열고, 아니면 사건 안의 ¶",
  think: "생각 — 사건 안의 ∴",
  call: "명령 — 사건 안의 ⚒ (같은 걸음의 바로 온 결과를 품음)",
  result: "도구 결과 — 같은 걸음이면 그 ⚒에, 다른 걸음이 시작된 뒤면 ⇣ (두 끝)",
  notice: "코드가 창에 넣은 알림 줄 — 그것을 읽는 사건의 안 ⇣ (좌표 #169)",
  inbox: "메시지함의 결과 — 읽는 사건의 첫 안쪽 ⇣ (12-10)",
  arrive: "약속을 지키는 돌려줌 — 보낸 이를 깨움 · 같은 턴의 다음 사건의 첫 안쪽 ⇣ (좌표 #160)",
  stop: "말이 끝남 — 사건의 때가 시작 ~ 끝이 됨 (좌표 #171)",
  preset: "미리 있는 것(지침 · 도구 목록 · 모델 · 모드) — 자리 없음 · 창의 모양 · 값이 바뀌면 ∆ (좌표 #169)",
  change: "바뀜 — 그 자리에 ∆ (12-6)",
  outside: "대화 밖의 일(누름 · 입력창의 명령) — @열쇠 ⚒ⁿ · 대상은 꼬리표 (12-14 · 좌표 #171)",
  swap: "교체 — 다음 답에 ∆ · 지은 토글 (좌표 #170)",
  fork: "포크 — 그 자리에 ⑂ · 새 흐름 (원리 1 · 12-6)",
  quiet: "줄 서기 같은 앱 자체의 일 — 좌표 밖(코드의 일)",
  attach: "말에 붙인 파일 — 그 말 사건 안의 ⇣ (좌표 #175)",
  other: "그 밖 — 사건 안의 ⁂ (0-17)",
};

const KIND_OF = { think: "∴", speak: "¶", call: "⚒", attach: "⇣", other: "⁂" };

/**
 * @typedef {Object} World
 * @property {string} house 출발지 열쇠(숫자) 또는 □
 * @property {string} key 세상의 열쇠(첫 말의 때) 또는 □
 * @property {{ id: string, n?: string, key?: string, name?: string, agent?: boolean }[]} people 참여자 — n = 이 세상의 @n(모르면 □), key = 긴 꼴의 열쇠 칸(@ 뒤)
 * @property {{ id: string, letter?: string, base: string, startTurn?: number, from?: { flow: string } }[]} flows 흐름 — letter를 모르면 □ · 태어난 차례로 매길 수 있으면 비움
 * @property {Item[]} items
 */

/**
 * 원본 기록에 좌표를 매겨요.
 * @param {World} world
 */
export function stamp(world) {
  const people = new Map(world.people.map((p) => [p.id, p]));
  const at = (p) => p?.n ?? UNKNOWN;
  /** @type {{ level: string, code: string, msg: string, item?: string }[]} */
  const findings = [];
  /** 기록마다 어떻게 다뤘나 — "모든 기록이 꼭 한 번" (점검) */
  const account = new Map();
  const note = (it, how, where) => {
    if (account.has(it.id)) findings.push({ level: "error", code: "두 번", msg: `기록 ${it.id}를 두 번 다뤘어요`, item: it.id });
    account.set(it.id, { how, where });
  };

  // 흐름 — 글자는 태어난 차례로 코드가 매겨요(좌표 #171) · 모르면 □
  const flows = new Map();
  let born = 0;
  for (const f of world.flows) {
    const letter = f.letter ?? (world.lettersKnown ? letterOf(++born) : UNKNOWN);
    flows.set(f.id, { ...f, letter, path: null, turn: f.startTurn ? f.startTurn - 1 : 0, own: 0, events: 0, open: null, buffer: [], wake: false, spokeSinceBase: new Set(), last: null, presets: new Map(), forkCount: new Map() });
  }
  const flowPath = (fl) => fl.path ?? [];
  const posOf = (fl, turn, event, inner) => ({ flow: fl.letter, turn: String(turn), ...(event ? { event: String(event) } : {}), ...(inner ? { inner: inner.map(String) } : {}) });

  /** 줄 하나 (긴 꼴) */
  const placeLine = (path, tail) => formatLine({ lead: "place", key: keyCells(world), path, tail });
  const out = { places: [], events: [], turns: [], flows: [], beings: [], toggles: [] };

  /** 지금 자리 — 열린 사건의 마지막 안쪽, 없으면 마지막 사건 */
  const current = (fl) => fl.open?.insides.at(-1) ?? fl.last;

  const closeEvent = (fl, t1) => {
    const ev = fl.open;
    if (!ev) return;
    ev.t1 = t1 ?? ev.insides.at(-1)?.t1 ?? ev.t0;
    fl.open = null;
    fl.last = ev;
  };

  const openEvent = (fl, who, t0) => {
    const p = people.get(who);
    const base = who === fl.base;
    if (!base && !fl.floor && !fl.wake) {
      findings.push({ level: "error", code: "발언권", msg: `${p?.name ?? who}이(가) 기준의 말이나 약속 없이 말을 시작했어요(12-13 6 · 좌표 #160)` });
    }
    fl.events += 1;
    const ev = { kind: "event", flow: fl, turn: fl.turn, sup: fl.events, who, t0, insides: [], marks: [] };
    out.events.push(ev);
    fl.open = ev;
    fl.wake = false;
    // 미뤄 둔 닿음(알림 줄 · 메시지함 · 돌려줌)은 그것을 읽는 이 사건의 첫 안쪽부터 (좌표 #169)
    if (!base) {
      for (const b of fl.buffer) addInside(fl, b.item, "⇣", b.link);
      fl.buffer = [];
    }
    if (fl.pendingSwap && !base) {
      ev.marks.push({ sym: "∆", target: who, label: "교체", item: fl.pendingSwap.id });
      fl.pendingSwap = null;
    }
    return ev;
  };

  const addInside = (fl, item, kind, link) => {
    const ev = fl.open;
    const n = ev.insides.length + 1;
    const ins = { kind: "inside", event: ev, n, k: kind, t0: item.t0, t1: item.t0, items: [item.id], step: item.step, marks: [], link, label: item.label };
    ev.insides.push(ins);
    note(item, "자리", ins);
    return ins;
  };

  const calls = new Map();
  /** 메시지 → 그 메시지의 (마지막) 사건 — 포크가 "그 답에서" 태어날 때 (이음의 기록 읽기) */
  const eventByMsg = new Map();
  const outsideCount = new Map();
  let waitingChanges = [];

  const items = [...world.items].sort((a, b) => a.t0 - b.t0 || 0);
  for (const it of items) {
    const fl = flows.get(it.flow);
    if (!fl && it.what !== "outside") {
      findings.push({ level: "error", code: "흐름", msg: `기록 ${it.id}의 흐름 ${it.flow}을 몰라요`, item: it.id });
      continue;
    }
    switch (it.what) {
      case "speak": {
        if (it.who === fl.base) {
          // 기준의 말 → 턴이 열려요(원리 1)
          closeEvent(fl, it.t0);
          fl.turn += 1;
          fl.own += 1;
          fl.events = 0;
          fl.floor = true; // 1:1에서는 기준이 말하면 대화 상대가 발언권을 받아요(좌표 #160)
          openEvent(fl, it.who, it.t0);
          addInside(fl, it, "¶");
          if (it.msg) eventByMsg.set(it.msg, fl.open);
          break;
        }
      }
      // falls through — 기준이 아닌 이의 말은 사건 안의 ¶
      case "think":
      case "call":
      case "attach":
      case "other": {
        if (!fl.open || fl.open.who !== it.who) {
          if (fl.open) closeEvent(fl, it.t0);
          openEvent(fl, it.who, it.t0);
        }
        if (fl.open.step !== it.step) fl.open.step = it.step;
        if (it.msg) eventByMsg.set(it.msg, fl.open);
        const ins = addInside(fl, it, KIND_OF[it.what]);
        for (let i = 0; i < (it.sends ?? 0); i++) ins.marks.push({ sym: "✉", label: "전달하기" });
        if (it.what === "call") {
          calls.set(it.call, ins);
          // 이 부름이 일으킨 바뀜이 기록에 먼저 적혀 있었으면 이제 이 자리에 붙여요
          for (const w of waitingChanges.filter((w) => w.it.call === it.call)) markChange(w.fl, w.it, w.label, ins, w.before);
          waitingChanges = waitingChanges.filter((w) => w.it.call !== it.call);
          for (let i = 0; i < (it.subs ?? 0); i++) ins.marks.push({ sym: "⑂", label: "서브" });
        }
        break;
      }
      case "result": {
        const call = calls.get(it.call);
        if (!call) {
          findings.push({ level: "error", code: "두 끝", msg: `결과 ${it.id}의 부름 ${it.call}이 없어요`, item: it.id });
          break;
        }
        const ev = call.event;
        // 같은 걸음에서 바로 온 결과 → 그 ⚒ 자리에 (좌표 #169). 그 사건에서 다른 걸음이 시작된 뒤면 ⇣ (두 끝)
        if (fl.open === ev && ev.step === call.step) {
          call.items.push(it.id);
          call.t1 = it.t0;
          note(it, "바로 온 결과", call);
        } else {
          if (!fl.open) openEvent(fl, ev.who, it.t0);
          addInside(fl, it, "⇣", call);
        }
        break;
      }
      case "notice":
      case "inbox": {
        if (fl.open && fl.open.who !== fl.base) addInside(fl, it, "⇣");
        else fl.buffer.push({ item: it });
        break;
      }
      case "arrive": {
        // 약속을 지키는 돌려줌 → 보낸 이를 깨움 · 같은 턴의 다음 사건의 첫 안쪽 (좌표 #160)
        const call = calls.get(it.call);
        fl.buffer.push({ item: it, link: call });
        fl.wake = true;
        if (fl.open) closeEvent(fl, it.t0);
        break;
      }
      case "stop": {
        // 말이 끝남 — 그 사건의 때가 시작 ~ 끝 (좌표 #171) · 발언권은 여기서 끝나요(약속이 깨우기 전까지 — 좌표 #160)
        if (fl.open) {
          closeEvent(fl, it.t0);
          note(it, "끝", fl.last);
        } else note(it, "끝", null);
        fl.floor = false;
        break;
      }
      case "preset": {
        const before = fl.presets.get(it.key);
        fl.presets.set(it.key, it.value);
        if (before === undefined || before === it.value) note(it, "창의 모양", null);
        else markChange(fl, it, `${it.key}: ${before} → ${it.value}`, undefined, before);
        break;
      }
      case "change": {
        // 처음 보는 값은 바뀜이 아니라 그때의 모습(창의 모양) · 같은 값을 다시 적은 것도 바뀜이 아니에요(12-6)
        const before = fl.presets.get(it.key);
        fl.presets.set(it.key, it.value);
        // 부름이 일으킨 바뀜(의도를 적음 · 이름을 바꿈)은 처음 보는 값이어도 그 일이 일어난 것이에요
        if (before === undefined && !it.call) note(it, "창의 모양", null);
        else if (before === it.value) note(it, "같은 값", null);
        else if (it.call && !calls.has(it.call)) waitingChanges.push({ fl, it, label: `${it.key}: ${before} → ${it.value}`, before });
        else markChange(fl, it, `${it.key}: ${before ?? "—"} → ${it.value}`, it.call ? calls.get(it.call) : undefined, before);
        break;
      }
      case "outside": {
        const n = (outsideCount.get(it.who) ?? 0) + 1;
        outsideCount.set(it.who, n);
        const target = fl ? current(fl) : null;
        const b = { kind: "being", who: it.who, sym: "⚒", n, t0: it.t0, label: it.label, target };
        out.beings.push(b);
        note(it, "대화 밖의 일", b);
        break;
      }
      case "swap": {
        // 교체 — 다음 답에 ∆ · 지은 토글(범위의 앞 끝은 모름 — 옛 기록) (좌표 #164 · #170)
        closeEvent(fl, it.t0);
        fl.pendingSwap = it;
        // 창을 새로 지었으니, 그 뒤에 다시 넣은 미리 있는 것은 바뀜이 아니라 새 창의 모양이에요(좌표 #170)
        fl.presets = new Map();
        const end = current(fl);
        out.toggles.push({ kind: "toggle", built: String(it.t0), from: null, to: end, flow: fl, label: it.label });
        note(it, "교체", end);
        break;
      }
      case "fork": {
        // 포크 — 그 자리에 ⑂ · 새 흐름은 그 사건의 다음 턴부터 (원리 1 · 12-6 · 좌표 #170)
        const parent = flows.get(it.from);
        const child = flows.get(it.flow);
        if (!parent) {
          // 부모 흐름이 이 기록에 없음(지워졌거나 아직 안 들어옴) — 법칙은 멈추지 않고 알리기만 해요(흐름은 모름 □ · 태어난 턴을 알면 거기서 이어요)
          findings.push({ level: "error", code: "두 끝", msg: `포크 ${it.id}의 부모 흐름 ${it.from}을 몰라요`, item: it.id });
          const known = typeof it.atTurn === "number" && it.atTurn >= 0;
          child.path = [{ flow: UNKNOWN, turn: known ? String(it.atTurn) : UNKNOWN }];
          child.turn = known ? it.atTurn : 0;
          note(it, "포크", null);
          break;
        }
        // 기록에 포크 자리의 사건이 없으면(옛 기록의 일부만 읽을 때) 알려 준 자리를 써요
        const place = it.atCall && calls.has(it.atCall)
          ? calls.get(it.atCall)
          : it.atMsg && eventByMsg.has(it.atMsg)
            ? eventByMsg.get(it.atMsg)
            : it.at
              ? { kind: "event", flow: parent, turn: it.at.turn, sup: it.at.event, marks: [] }
              : current(parent);
        const callFound = !it.atCall || calls.has(it.atCall);
        const msgFound = !it.atMsg || eventByMsg.has(it.atMsg);
        if (!callFound && it.atMsg && msgFound) findings.push({ level: "warn", code: "두 끝", msg: `포크 ${it.id}를 보낸 부름 ${it.atCall}이 기록에 없어 그 답에서 태어난 것으로 읽었어요`, item: it.id });
        else if (!callFound || !msgFound) findings.push({ level: "error", code: "두 끝", msg: `포크 ${it.id}가 태어난 자리를 기록에서 찾지 못했어요`, item: it.id });
        if (!place) {
          // 태어난 자리가 없음 — 부모 흐름에 아직 아무 사건도 없을 때. 법칙은 멈추지 않고 알리기만 해요(자리는 모름 □)
          findings.push({ level: "error", code: "두 끝", msg: `포크 ${it.id}의 부모 흐름에 그때 아무 자리도 없어요 (부름 ${it.atCall ? "있음" : "없음"} · 답 ${it.atMsg ? "있음" : "없음"})`, item: it.id });
          child.path = [...flowPath(parent), { flow: parent.letter, turn: UNKNOWN }];
          child.turn = 0;
          child.from = parent;
          note(it, "포크", null);
          break;
        }
        const n = (parent.forkCount.get(place) ?? 0) + 1;
        parent.forkCount.set(place, n);
        place.marks = place.marks ?? [];
        place.marks.push({ sym: "⑂", label: "포크" });
        child.path = [...pathOf(place)];
        child.turn = place.kind === "inside" ? place.event.turn : place.turn;
        // (v0.9.94 ② 다시 받기 — 아빠 좌표 #195 "다시 받기도 포크로") 질문(기준의 말 사건)에서 태어난 흐름은 그 턴을 이어요 —
        //   다음 사건은 그 질문 다음 차례(`A 2¹ › B 2²`) · 기준이 이미 말했으니 대화 상대의 발언권도 함께 와요
        if (place.kind === "event" && place.who === parent.base) {
          child.events = place.sup;
          child.floor = true;
        }
        child.from = parent;
        note(it, "포크", place);
        break;
      }
      case "quiet":
        note(it, "좌표 밖", null);
        break;
      default:
        findings.push({ level: "error", code: "무엇", msg: `모르는 기록 ${it.what}`, item: it.id });
    }
  }
  for (const fl of flows.values()) closeEvent(fl);
  for (const w of waitingChanges) findings.push({ level: "error", code: "두 끝", msg: `바뀜 ${w.it.id}을 일으킨 부름 ${w.it.call}이 기록에 없어요`, item: w.it.id });

  /** 바뀜 — 무엇이(key) 무엇에서(before) 무엇으로(value) 바뀌었나도 함께 남겨요(꼬리표 "무엇" · 화면의 가는 줄) */
  function markChange(fl, it, label, at, before) {
    // 기준의 말 사건이 열려 있을 때의 바뀜은 그 사건에(12-6 `A 12¹ ∆¹ @2`) · 답 도중이면 그 안쪽 자리에(좌표 #170)
    const place = at ?? (fl.open && fl.open.who === fl.base ? fl.open : current(fl));
    if (!place) {
      findings.push({ level: "error", code: "바뀜의 자리", msg: `바뀜 ${it.id}을 붙일 자리가 없어요`, item: it.id });
      return;
    }
    place.marks = place.marks ?? [];
    place.marks.push({ sym: "∆", target: it.about, label, key: it.key, before, value: it.value });
    note(it, "바뀜", place);
  }

  // ── 줄로 적기 ──
  function pathOf(place) {
    if (place.kind === "inside") {
      const ev = place.event;
      return [...flowPath(ev.flow), posOf(ev.flow, ev.turn, ev.sup, [place.n])];
    }
    return [...flowPath(place.flow), posOf(place.flow, place.turn, place.sup)];
  }
  const markTail = (marks) => {
    const counts = new Map();
    const tail = [];
    for (const m of marks ?? []) {
      const n = (counts.get(m.sym) ?? 0) + 1;
      counts.set(m.sym, n);
      tail.push({ t: "event", ev: { sym: m.sym, n: String(n) } });
      if (m.target) tail.push({ t: "who", who: { n: at(people.get(m.target)) } });
    }
    return tail;
  };
  const KORDER = ["∴", "¶", "⚒", "⇣", "⁂"];
  for (const ev of out.events) {
    for (const ins of ev.insides) {
      const line = placeLine(pathOf(ins), [{ t: "kind", kind: ins.k }, ...markTail(ins.marks)]);
      out.places.push({ line, event: ev, t0: ins.t0, t1: ins.t1, items: ins.items, who: ev.who, kind: ins.k, label: ins.label, link: ins.link ? placeLine(pathOf(ins.link), []) : undefined });
    }
    const counts = KORDER.map((k) => [k, ev.insides.filter((i) => i.k === k).length]).filter(([, n]) => n);
    const sum = { total: { n: String(ev.insides.length) }, ...(counts.length ? { terms: counts.map(([k, n]) => ({ sym: k, n: String(n) })) } : {}) };
    findings.push(...lintSum(sum).map((f) => ({ ...f, msg: `${f.msg} — 사건` })));
    const tail = [{ t: "who", who: { n: at(people.get(ev.who)) } }, ...markTail(ev.marks), { t: "sum", sum }];
    ev.line = placeLine(pathOf(ev), tail);
  }
  // 턴 · 흐름의 총 양 (턴은 사건 수 · 흐름은 그 흐름이 가진 턴 수 — 좌표 #170)
  const turnsSeen = new Map();
  for (const ev of out.events) {
    const k = `${ev.flow.id}:${ev.turn}`;
    turnsSeen.set(k, { flow: ev.flow, turn: ev.turn, n: Math.max(turnsSeen.get(k)?.n ?? 0, ev.sup) });
  }
  for (const t of turnsSeen.values()) out.turns.push({ line: placeLine([...flowPath(t.flow), posOf(t.flow, t.turn)], [{ t: "sum", sum: { total: { n: String(t.n) } } }]) });
  for (const fl of flows.values()) {
    // 흐름의 총 양 = 그 흐름이 가진 턴 수(좌표 #170). 옛 기록의 일부만 읽어 흐름의 앞이 기록에 없으면 모름 □
    const own = new Set(out.events.filter((e) => e.flow === fl).map((e) => e.turn)).size;
    const n = fl.startTurn && !fl.from ? UNKNOWN : String(own);
    out.flows.push({ line: placeLine([...flowPath(fl), { flow: fl.letter }], [{ t: "sum", sum: { total: { n } } }]) });
  }
  for (const b of out.beings) {
    const p = people.get(b.who);
    b.line = formatLine({ lead: "who", who: { key: keyOfPerson(world, p) }, tail: [{ t: "event", ev: { sym: b.sym, n: String(b.n) } }] });
    if (b.target) b.targetLine = placeLine(pathOf(b.target), []);
  }
  for (const tg of out.toggles) {
    tg.line = formatLine({ lead: "toggle", key: keyCells(world), toggle: { layer: UNKNOWN, built: tg.built }, from: [{ flow: UNKNOWN, turn: UNKNOWN }], to: pathOf(tg.to) });
  }

  // ── 점검: 모든 기록이 꼭 한 번 다뤄졌나 ──
  for (const it of world.items) {
    if (!account.has(it.id) && !findings.some((f) => f.item === it.id)) findings.push({ level: "error", code: "빠짐", msg: `기록 ${it.id}(${it.what})가 어디에도 들지 않았어요`, item: it.id });
  }
  return { ...out, account, findings, flowMap: flows };
}

/** 세상 열쇠의 칸 */
function keyCells(world) {
  return { house: world.house, times: [world.key] };
}

/** 사람의 긴 꼴 열쇠 칸 (@ 뒤) */
function keyOfPerson(world, p) {
  if (p?.keyCells) return p.keyCells;
  return { house: world.house, times: p?.agent ? [UNKNOWN, UNKNOWN] : [UNKNOWN] };
}
