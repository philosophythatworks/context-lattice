# Context Lattice — The Context Coordinate System & Unbroken Memory, by Philosophy That Works

**An address-based context coordinate system, reference folding architecture, and autonomic coordinate engine for preserving the continuity of the present in finite LLM context windows**

**English** · [한국어](README.ko.md)

`context-lattice` is a memory architecture and zero-dependency reference engine that stamps deterministic **Context Coordinates** and mathematical **Conservation Equations** onto every event in an AI agent's raw transcript log, folds completed tool payloads into 1-line coordinate pointers, and shifts window partitions only at natural idle boundaries—preserving the **Continuity of the Present** without mid-task amnesia. (PTW is short for Philosophy That Works.)

This repository contains the full research paper (in English and Korean), the deterministic coordinate engine (`src/coord/`), and the one-second reproducible benchmark suite (`benchmark/`).

- 📄 **Read the Full Paper**: [English Paper (`paper/context-coordinates.en.md`)](paper/context-coordinates.en.md) · [한국어 논문 (`paper/context-coordinates.ko.md`)](paper/context-coordinates.ko.md) · **DOI**: [`10.5281/zenodo.23377916`](https://doi.org/10.5281/zenodo.23377916)
- 🎬 **1-Minute Overview Video (YouTube)**: [**Watch on YouTube (`youtu.be/LwF-UjvCUug`)**](https://youtu.be/LwF-UjvCUug) *("AI sees through a small window — Fold what's done, unfold any of it, word for word.")*

[![Context Lattice — 1-Minute Overview Video (YouTube)](https://img.youtube.com/vi/LwF-UjvCUug/maxresdefault.jpg)](https://youtu.be/LwF-UjvCUug)

---

## What It Does

Given an immutable raw transcript log of human–agent interactions, deterministic runtime code (`src/coord/stamp.mjs`) assigns a unique, canonical coordinate to every session, flow, turn, event, and atomic item—and verifies conservation equations (`src/coord/lint.mjs`) without invoking an LLM.

Below is an excerpt from stamping a real 347-item agent session fixture (`test/fixtures/real-record.json` → `test/fixtures/real-record.expected.txt`):

```text
⌂□⧖□ □ 149¹ @1 (∑1 = ¶∑1)
  ⌂□⧖□ □ 149¹₁ ¶
⌂□⧖□ □ 149² @□ (∑11 = ∴∑3 + ¶∑1 + ⚒∑3 + ⇣∑4)
  ⌂□⧖□ □ 149²₁ ⇣
  ⌂□⧖□ □ 149²₂ ∴
  ⌂□⧖□ □ 149²₃ ⚒
  ⌂□⧖□ □ 149²₄ ⇣
  ⌂□⧖□ □ 149²₅ ⚒ ⑂¹ ⑂² ⑂³ ⑂⁴
  …
⌂□⧖□ □ 149³ @□ (∑8 = ∴∑2 + ¶∑1 + ⚒∑2 + ⇣∑3)
  ⌂□⧖□ □ 149³₁ ⇣  ↔ ⌂□⧖□ □ 149²₅
```

How to read it:

- **`⌂` and `⧖` identify physical space and time**: the host environment (`⌂`) and Unix millisecond timestamps (`⧖`) of session and agent genesis (`□` marks unknown fields imported from legacy logs).
- **`A`, `B`, `C`… identify Dialogue Flows (Threads)**: `A` is the initial flow; forked conversations and sub-agent threads receive sequential alphabetic labels in order of birth.
- **`149¹`, `149²`, `149³` identify Turns and Events**: `149` is Turn 149, and the superscript ordinal (`¹`, `²`, `³`) marks each discrete event within that turn—**assigned at event start and invariant regardless of completion order**.
- **`₁`, `₂`, `₃`… and symbols (`∴`, `¶`, `⚒`, `📎`, `⇣`) identify Atomic Items**: classified into Reasoning (`∴`), Speech (`¶`), Tool Execution (`⚒`), Attachment (`📎`), and System Notice (`⇣`). `⑂¹` denotes a sub-agent fork dispatch, and `↔` links its return join.
- **`(∑11 = ∴∑3 + ¶∑1 + ⚒∑3 + ⇣∑4)` is the Conservation Equation**: runtime code verifies that the total item count (`∑11`) equals the exact sum of the five item types (`3 + 1 + 3 + 4`). If a single record is dropped or mismerged, linting fails immediately.

---

## Why We Built It

When an active context window fills up, most agent frameworks overwrite the entire dialogue history with a generative summary (**Compaction**). Yet what is physically finite is only the **Active Context Window**—not the **Raw Transcript Log** on disk.

Overwrite compaction suffers from three structural defects:
1. **Loss of Return Address**: Summaries strip away exact pointers to turns, line numbers, and raw tool outputs, making lossless verification impossible.
2. **No Integrity Checksum**: There is no conservation law to verify what was omitted during summarization.
3. **Severance of the Present & Confabulation**: Replacing the window mid-task erases the vivid working context; waking up with only a summary, the agent hallucinates that completed steps remain undone or repeats finished work (**Confabulation**).

**Context Lattice** resolves these defects through four architectural principles:

1. **Raw Immutability, Coordinate Binding & Conservation Laws**: The raw log on disk is append-only and never modified. Every condensed item in the window carries a canonical coordinate pointer (`Start ~ End`) for on-demand lossless dereferencing, while runtime code enforces both the Event Partition Identity ($N_{\text{total}} = \sum N_\tau$) and the Window-Level MECE Coordinate Conservation Law ($N_{\text{in}} = N_{\text{kept}} + N_{\text{absorbed}} + N_{\text{emitted}}$).
2. **Frequency-Ordered 5-Slot Window & Append-at-Tail Dereferencing**: Ordered from least frequently updated at the top (1. System/Agent OS $\to$ 2. Semantic Causal State $\to$ 3. Hierarchical Episodic Index) to most frequently updated at the bottom (4. Active Raw Window $\to$ 5. Current Turn Execution). When dereferencing a folded coordinate, the raw text is loaded ephemerally at the tail of Slot 5 and re-folded after the turn, keeping the KV cache across Slots 1–4 100% intact.
3. **Completed Tool Folding & Bottom-Up Stratigraphy**: In real coding sessions, dialogue is only 5–15% of context volume while **85–95% is tool call arguments and outputs**. Folding completed tools into 1-line coordinate pointers extends single-window continuity by **∼8.6–9× (from 42 turns to 380–391 turns)** with **0% dialogue loss**. Furthermore, fixing the raw record as **Floor 0** and counting index layers upward (`Floor 1 → Floor 2 → Floor 3`) guarantees that existing layer numbers never change.
4. **Asynchronous Pre-Building & Idle-Boundary Stepped Shifts**: Indices are built asynchronously in the background, verified by the deterministic linter (`lint.mjs`), and swapped atomically only at natural idle boundaries, raising the prompt prefix (KV) cache hit rate from **16.5% to 95.9%**.

---

## Summary of the 4 Quantitative Benchmarks (Empirical & Analytical)

Full experimental details and analysis are in [Section 4 of the paper](paper/context-coordinates.en.md#4-empirical-evaluation-four-quantitative-studies-and-open-verification).

| Evaluation Dimension | Method | Conventional Compaction / Sliding | **Proposed (Context Lattice)** | Key Finding |
| :--- | :---: | :---: | :---: | :--- |
| **1. Actual Compaction (`L2049`) vs. Coordinate Lookup (20 Probes)** | **Empirical** | 6/20 (**30.0%**, summary) · 8/20 (**40.0%**, +kept raw tail) | **20 / 20 (100.0%)** | 1 summary state inversion; 0 loss & 0 error via coordinate lookup |
| **2. Single-Window (200K) Continuous Lifespan** | **Empirical Ratio + Analytical** | Saturates & severs every **42 turns** | **380–391 turns (∼8.6–9× longer)** | Calculated using measured 85–95% tool payload ratio (4,500 tokens/turn raw, 25 tokens folded) |
| **3. 100-Turn Prompt Prefix (KV) Cache Hit Rate** | **Analytical** | **16.5%** (invalidated every turn) | **95.9%** | Assuming 60K active window & 25-turn idle stepped shift cycle (**95.1% less recomputation**) |
| **4. Autonomic Coordinate Engine Integrity & Speed** | **Empirical** | Manual LLM indexing: 48 cascading shifts | **347 lines 0 errors / 50K lines ∼185–260 ms** | Exhaustively stamps & verifies 347 real items and 10,000 turns (40K coords, 20K equations) |

---

## Reproduce in 1 Second (Zero Dependencies)

Requires only **Node.js (v20+)**. No `npm install` or external packages are needed.

```bash
git clone https://github.com/philosophythatworks/context-lattice.git
cd context-lattice

# 1. Run all 38 conformance tests (notation, stamp, lint, 347-line skeleton & 115 coordinate return addresses)
npm test

# 2. Reproduce the 4 benchmark suites (empirical + parameter-grounded calculations) in under 1 second
npm run benchmark
```

- **Directly reproduced by `npm run benchmark` / `npm test`**: 347-record skeleton (`real-record.json`) coordinate integrity and 115/115 (100.0%) return-address mapping, Table 4.2(2) (parameter-grounded occupancy curve), Table 4.3 (parameter-grounded KV cache calculation), and Table 4.4(2) throughput across 100–50,000 lines.
- **Aggregated from full internal development transcripts**: Table 4.1 (20-probe text recall evaluation against actual compaction summary `L2049`), Table 4.2(1) (3-session payload ratios), and the pre-code manual indexing comparison in Table 4.4(1) were measured on our internal session transcripts; to protect conversation privacy, the repository ships only the text-free 347-record structural skeleton (`test/fixtures/real-record.json`).

---

## Repository Layout

- [`paper/context-coordinates.en.md`](paper/context-coordinates.en.md) — Full research paper in English
- [`paper/context-coordinates.ko.md`](paper/context-coordinates.ko.md) — Full research paper in Korean (한국어 원문)
- [`src/coord/`](src/coord/) — Deterministic autonomic coordinate engine (`notation.mjs`, `stamp.mjs`, `lint.mjs`, `render.mjs`, `read/`)
- [`test/`](test/) — Conformance test suite and anonymized text-free 347-item real-session skeleton (`real-record.json`)
- [`benchmark/benchmark_paper.mjs`](benchmark/benchmark_paper.mjs) — Reproducible benchmark suite for Section 4

---

## Licensing

Context Lattice follows the same multi-licensing structure as [`ptw-grid`](https://github.com/philosophythatworks/ptw-grid). Every source file carries an SPDX header, [`REUSE.toml`](REUSE.toml) maps the copyright and licence of every file in the repository, and the full licence texts are in [`LICENSES/`](LICENSES/).

- **Engine and benchmark code (`src/`, `benchmark/`, `test/*.mjs`)**: [AGPL-3.0-only](LICENSES/AGPL-3.0-only.txt). You may use, study, modify, and share it under the same licence. If the AGPL does not fit your use (for example, inside a closed-source product or service), a **commercial licence** is available from the copyright holder; see [`COMMERCIAL.md`](COMMERCIAL.md).
- **Research paper and documentation (`paper/`, `README*.md`, policy files)**: [CC-BY-4.0](LICENSES/CC-BY-4.0.txt).
- **Conformance material and canonical coordinate examples (`test/fixtures/*`)**: [CC0-1.0](LICENSES/CC0-1.0.txt). Anyone may use them to build a compatible coordinate reader or writer under any licence.
- **Names and trademarks**: The licences above cover code and text, not the names `Philosophy That Works`, `PTW`, `Context Lattice`, or `ieum (이음)`. See [`TRADEMARKS.md`](TRADEMARKS.md).

---

## How It Is Made

This research paper and engine were created by the copyright holder (**Hwang Dae Jin**) working in deep partnership with an AI agent (**Yeni**) while building and living inside the local agent OS **ieum (이음)** across hundreds of turns. The human author established the foundational questions, philosophical principles, and architectural decisions; the human and AI co-developed the formalization, code engine, and empirical verification.

To cite this work, use the **"Cite this repository"** button on GitHub or refer to [`CITATION.cff`](CITATION.cff).

---

© 2026 Hwang Dae Jin (Philosophy That Works). Philosophy That Works is not yet an incorporated company, and the copyright is held by Hwang Dae Jin personally. ([philosophythatworks.com](https://philosophythatworks.com/))
