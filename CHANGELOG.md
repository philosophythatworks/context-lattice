# Changelog

## v0.1.0 (2026-10-15)

- Initial public release of **Context Lattice** (`context-lattice`).
- Full research paper in Korean ([`paper/context-coordinates.ko.md`](paper/context-coordinates.ko.md)) and English ([`paper/context-coordinates.en.md`](paper/context-coordinates.en.md)), plus 1-minute overview video ([`paper/context-coordinates-overview.mp4`](paper/context-coordinates-overview.mp4)): *"The Context Coordinate System and the Principle of Unbroken Memory"*, by Hwang Dae Jin and Yeni (Philosophy That Works).
- Deterministic autonomic coordinate engine (`src/coord/notation.mjs`, `stamp.mjs`, `lint.mjs`, `render.mjs`, `read/ieum.mjs`, `read/claude-code.mjs`) and 38 conformance tests (`test/`), including 347-record anonymized skeleton stamping and 100% return-address verification (`test/fixtures/real-record.json`).
- One-second reproducible benchmark suite (`benchmark/benchmark_paper.mjs`) covering all 4 quantitative evaluations in Section 4.
