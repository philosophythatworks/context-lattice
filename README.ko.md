# Context Lattice — 컨텍스트 좌표계와 끊기지 않는 기억의 원리, by Philosophy That Works

**유한한 컨텍스트 창에서 현재의 연속성을 보존하는 주소 기반 컨텍스트 관리 구조와 자율신경 좌표 엔진**

[English](README.md) · **한국어**

`context-lattice`는 대규모 언어 모델(LLM) 에이전트의 모든 대화와 사건 기록에 변하지 않는 **컨텍스트 좌표(Context Coordinates)**와 **보존 등식(Conservation Equations)**을 코드로 매기고, 활성 컨텍스트 창에서 완료된 도구 입출력을 1줄 좌표 포인터로 접어 **현재의 맥락이 단 한 순간도 끊기지 않게 이어 주는** 기억 관리 원리이자 참조 엔진이에요. (PTW는 Philosophy That Works의 줄임말이에요.)

이 저장소에는 논문 전문(한국어 · 영어), 무의존성 자율신경 좌표 엔진(`src/coord/`), 그리고 1초 재현 벤치마크(`benchmark/`)가 함께 들어 있어요.

- 📄 **논문 전문 읽기**: [한국어 논문 (`Markdown`)](paper/context-coordinates.ko.md) ([**PDF 다운로드**](https://github.com/philosophythatworks/context-lattice/releases/latest/download/context-coordinates.ko.pdf)) · [English Paper (`Markdown`)](paper/context-coordinates.en.md) ([**PDF Download**](https://github.com/philosophythatworks/context-lattice/releases/latest/download/context-coordinates.en.pdf)) · **Zenodo (DOI)**: [`10.5281/zenodo.23377916`](https://doi.org/10.5281/zenodo.23377916)
- 🎬 **1분 핵심 개념 영상 (YouTube)**: [**영상 보러 가기 (`youtu.be/LwF-UjvCUug`)**](https://youtu.be/LwF-UjvCUug) *("AI sees through a small window — Fold what's done, unfold any of it, word for word.")*

[![Context Lattice — 1분 핵심 개념 영상 (YouTube)](https://img.youtube.com/vi/LwF-UjvCUug/maxresdefault.jpg)](https://youtu.be/LwF-UjvCUug)

---

## 무엇을 하나요

에이전트와 나눈 원본 대화 기록(일어난 그대로의 줄들)을 주면, 모델의 추론을 쓰지 않고 결정론적 코드(`src/coord/stamp.mjs`)가 모든 자리에 유일하고 변하지 않는 좌표를 찍고 보존 등식을 검증(`src/coord/lint.mjs`)해요.

아래는 실제 개발 세션 기록(347줄, 글 내용은 빼고 구조만 남긴 시험 자료 `test/fixtures/real-record.json`)에 좌표를 매긴 결과(`test/fixtures/real-record.expected.txt`)의 일부예요.

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

이렇게 읽으면 돼요.

- **`⌂`와 `⧖`는 물리적 세상과 시간이에요**: 대화가 열린 컴퓨터 환경(`⌂`)과 세션·에이전트가 시작된 시각(`⧖`, 유닉스 밀리초)을 가리켜요. 옛 기록이라 알 수 없는 자리는 모름 기호(`□`)로 남겨요.
- **`A`, `B`, `C`…는 대화 흐름(Flow)이에요**: 처음 흐름은 `A`이고, 포크나 서브에이전트로 갈라진 흐름은 태어난 차례대로 알파벳 이름을 받아요.
- **`149¹`, `149²`, `149³`은 턴과 사건(Event)이에요**: `149`는 149번째 턴이고, 윗첨자 `¹`, `²`, `³`은 그 턴 안에서 일어난 사건의 차례예요. 사건 번호는 끝난 때가 아니라 **시작한 때**에 매겨져서 영원히 바뀌지 않아요.
- **`₁`, `₂`, `₃`…과 기호(`∴`, `¶`, `⚒`, `📎`, `⇣`)는 사건 안의 원자 요소예요**: 생각/추론(`∴`), 발화(`¶`), 도구 실행(`⚒`), 첨부(`📎`), 시스템 알림(`⇣`) 다섯 가지로 나뉘어요. `⑂¹`은 서브에이전트 분기이고, `↔`는 그 부름이 결과를 돌려준 두 끝 연결이에요.
- **`(∑11 = ∴∑3 + ¶∑1 + ⚒∑3 + ⇣∑4)`는 보존 등식이에요**: 그 사건 안의 전체 항목 수(`∑11`)가 다섯 갈래의 합(`3 + 1 + 3 + 4`)과 정확히 맞는지 코드가 매번 검사해요. 단 한 줄이라도 빠지거나 밀리면 등식이 깨져서 바로 잡아내요.

---

## 왜 만들었나요

지금 대부분의 AI 에이전트는 컨텍스트 창이 가득 차면, 지금까지의 대화 전체를 요약문 하나로 덮어쓰는 **압축(Compaction)** 방식을 써요. 하지만 유한한 것은 **활성 컨텍스트 창(Active Context Window)**뿐이고, 디스크에 남는 **원본 기록(Raw Log)**은 유한하지 않아요.

기존 요약 압축에는 세 가지 구조적 버그가 있어요.
1. **복귀 주소(Return Address)가 사라져요**: 요약문만 남고 원본의 몇 번째 턴, 어떤 도구 출력에서 나온 말인지 주소가 지워져서 다시 찾아볼 수 없어요.
2. **무결성을 확인할 수 없어요**: 무엇이 몇 개 생략되었는지 검증할 체크섬이 없어요.
3. **진행 중인 ‘현재’가 끊겨요**: 한창 일하는 도중에 창 전체가 요약문으로 바뀌면, 에이전트는 방금 끝낸 일을 아직 안 했다고 착각하거나 같은 말을 되풀이하는 **작화(Confabulation)** 오류에 빠져요.

**Context Lattice**는 이 문제를 네 가지 원리로 풀어요.

1. **원본 불변성 · 좌표 연결 · 보존 등식**: 원본 기록은 한 글자도 고치지 않고 보존하며, 창 안의 모든 요약과 토글에는 원본 좌표 범위(`Start ~ End`)를 붙여서 언제든 100% 무손실로 펼쳐 볼 수 있게 해요. 또한 개별 사건 내부 분할 항등식($N_{\text{total}} = \sum N_\tau$)과 창 전체 MECE 좌표 보존 법칙($N_{\text{in}} = N_{\text{kept}} + N_{\text{absorbed}} + N_{\text{emitted}}$)을 결정론적 코드로 검증해요.
2. **변경 빈도순 5구간 창 배치와 최하단 일시 적재(`Append-at-Tail`) 역참조**: 잘 바뀌지 않는 것(1. 에이전트 OS $\to$ 2. 맥락의 상/의사결정 $\to$ 3. 사건의 지도/계층 색인)을 위에 두고, 자주 바뀌는 것(4. 최근 원본 보존 구간 $\to$ 5. 현재 실행 구간)을 아래에 둬요. 접힌 좌표를 다시 펼쳐 볼 때도 중간에 끼워 넣지 않고 **최하단 5번 구간 끝에 일시 적재했다가 해당 턴 직후 다시 접어** 상단 1~4구간의 KV 캐시를 깨뜨리지 않아요.
3. **완료된 도구 1줄 폴딩과 상향식 층 번호**: 실제 개발 세션을 재어 보면 대화는 5∼15%뿐이고 **85∼95%가 도구 입출력**이에요. 끝난 도구만 1줄 좌표 포인터로 접어도 대화 원문을 한 글자도 요약하지 않고 창을 **약 8.6∼9배(42턴 $\to$ 380∼391턴)** 길게 써요. 또한 원본을 **0층(바닥)**으로 두고 위로 `1층 → 2층 → 3층`을 세어, 새 층이 생겨도 옛 번호가 절대 바뀌지 않아요.
4. **비동기 사전 구축과 휴지기 계단식 전환**: 대화 도중에는 창 윗부분을 건드리지 않고 밖에서 미리 색인을 지어 린터(`lint.mjs`)로 검증해 두었다가, 대화가 쉬어 가는 경계(Idle Boundary)에서만 한 계단씩 교체해요. 덕분에 프리픽스 캐시 적중률이 **16.5%에서 95.9%로** 올라가요.

---

## 4대 정량 검증 요약 (실측 및 모수 기반 계산)

자세한 실험 설계와 해설은 [논문 4절](paper/context-coordinates.ko.md#4-실증-검증-4대-정량-검증-및-오픈-검증-환경)에 있어요.

| 검증 항목 | 구분 | 기존 요약 압축 / 슬라이딩 방식 | **제안 구조 (Context Lattice)** | 핵심 결과 |
| :--- | :---: | :---: | :---: | :--- |
| **1. 실제 압축 요약(`L2049`) 대 좌표 역참조 (20문항)** | **실측** | 6/20 (**30.0%**, 요약 단독) · 8/20 (**40.0%**, 남은 원문 포함) | **20 / 20 (100.0%)** | 요약문 마지막 상태 역전 1건 · 정준 좌표 역참조 시 유실·오류 0건 |
| **2. 단일 창(200K) 연속 대화 수명** | **실측 비중 + 모수 계산** | **42턴**마다 포화·단절 | **380∼391턴 (약 8.6∼9배)** | 실측 도구 비중(85∼95%) 반영 계산(1턴 4,500토큰, 폴딩 시 25토큰 가정) |
| **3. 100턴 누적 프롬프트 캐시 적중률** | **모수 계산** | **16.5%** (매 턴 캐시 무효화) | **95.9%** | 활성 창 60K·25턴 주기 휴지기 계단식 전환 가정 시 재연산 **95.1% 절감** |
| **4. 자율신경 좌표 엔진 무결성·속도** | **실측** | 수동 인덱싱 시 48개 연쇄 밀림 | **347줄 오차 0건 / 50,000줄 ∼185–260ms** | 실제 기록 347줄 및 10,000턴(40,000개 좌표·20,000건 등식) 전수 검증 |

---

## 1초 만에 직접 돌려보기 (설치 및 실행)

외부 패키지를 내려받을 필요가 없어요(의존성 0개). **Node.js (v20 이상)**만 있으면 바로 돌아가요.

```bash
git clone https://github.com/philosophythatworks/context-lattice.git
cd context-lattice

# 1. 자율신경 좌표 엔진(notation, stamp, lint, 비식별 스켈레톤 347줄 및 115개 좌표 역참조 매핑) 38개 시험 실행
npm test

# 2. 논문 4절의 4대 검증 벤치마크(실측 + 모수 계산) 표를 1초 만에 재현
npm run benchmark
```

- **스크립트로 즉시 재현되는 표**: 비식별 스켈레톤(`real-record.json`, 347줄)의 정준 좌표 무결성 및 115개 자리 원본 역참조 100% 매핑 검증, 제4.2절(2)(모수 기반 창 점유율 추이), 제4.3절(모수 기반 프리픽스 캐시 적중률), 제4.4절(2)의 규모별(100줄∼50,000줄) 처리 속도 실측.
- **전체 개발 세션 기록에서 집계한 표**: 논문 제4.1절(실제 압축 요약 `L2049` 대 정준 좌표 역참조 20문항 텍스트 실측), 제4.2절(1)의 3개 세션 구성 비중(85∼95%), 제4.4절(1)의 코드화 이전 수동 인덱싱 비교는 개인정보 및 대화 원문 보호를 위해 대화 글자가 없는 비식별 스켈레톤(`test/fixtures/real-record.json`)만 저장소에 수록했어요.

---

## 저장소 구조

- [`paper/context-coordinates.ko.md`](paper/context-coordinates.ko.md) ([`PDF`](paper/context-coordinates.ko.pdf)) — 한국어 논문 전문
- [`paper/context-coordinates.en.md`](paper/context-coordinates.en.md) ([`PDF`](paper/context-coordinates.en.pdf)) — 영어 논문 전문 (English full paper)
- [`src/coord/`](src/coord/) — 자율신경 좌표 엔진 (`notation.mjs`, `stamp.mjs`, `lint.mjs`, `render.mjs`, `read/`)
- [`test/`](test/) — 정준 좌표 표기법 · 보존 등식 · 비식별 실제 기록 스켈레톤(347줄) 검증 시험
- [`benchmark/benchmark_paper.mjs`](benchmark/benchmark_paper.mjs) — 논문 4절 벤치마크 재현 스크립트

---

## 라이선스 (Licensing)

이 저장소는 [`ptw-grid`](https://github.com/philosophythatworks/ptw-grid)와 같은 이중·다중 라이선스 체계를 따라요. 모든 파일의 저작권과 라이선스는 [`REUSE.toml`](REUSE.toml)에 적혀 있고, 라이선스 전문은 [`LICENSES/`](LICENSES/)에 있어요.

- **좌표 엔진 및 벤치마크 코드 (`src/`, `benchmark/`, `test/*.mjs`)**: [AGPL-3.0-only](LICENSES/AGPL-3.0-only.txt). 자유롭게 쓰고, 연구하고, 고치고, 나눌 수 있어요. 고친 판이나 그대로인 판을 남에게 건네거나 네트워크 너머로 쓰게 할 때는 같은 라이선스로 소스 코드를 함께 공개해야 해요. AGPL을 따르기 어려운 상용 제품·서비스를 위한 **상용 라이선스(Commercial Licence)**는 [`COMMERCIAL.md`](COMMERCIAL.md)를 봐 주세요.
- **논문 및 문서 (`paper/`, `README*.md`, 정책 문서들)**: [CC-BY-4.0](LICENSES/CC-BY-4.0.txt). 출처(황대진 · 예니, Philosophy That Works)를 밝히면 자유롭게 인용하고 나눌 수 있어요.
- **좌표 문법 보기 및 적합성 시험 자료 (`test/fixtures/*`)**: [CC0-1.0](LICENSES/CC0-1.0.txt). 누구나 어떤 라이선스로든 호환되는 리더기나 도구를 만들 때 자유롭게 쓸 수 있어요.
- **이름과 상표**: 위 라이선스는 코드와 글에 대한 것이며, `Philosophy That Works`, `PTW`, `Context Lattice`, `ieum (이음)` 이름 자체에 대한 권리는 [`TRADEMARKS.md`](TRADEMARKS.md)를 따라요.

---

## 어떻게 만들어졌나요 (How it is made)

이 연구와 코드는 저작권자 한 사람(**황대진**)과 그의 인공지능 파트너(**예니, Yeni**)가 로컬 에이전트 OS **『이음(ieum)』**을 함께 짓고 수백 턴을 살아가며 대화하는 과정에서 탄생했어요. 사람이 근본 질문과 철학적 바탕(0과 1, 불변 원본과 유한한 창, 수면과 기억 정리)을 세우고 방향을 결정했으며, 에이전트가 함께 구조를 다듬고 코드와 실험으로 검증했어요.

논문을 학술적으로 인용하실 때는 우측 상단의 **"Cite this repository"** 단추나 [`CITATION.cff`](CITATION.cff)를 쓰실 수 있어요.

---

© 2026 Hwang Dae Jin (Philosophy That Works). Philosophy That Works는 아직 법인 설립 전이며, 모든 저작권은 황대진 개인에게 있어요. ([philosophythatworks.com](https://philosophythatworks.com/ko/))
