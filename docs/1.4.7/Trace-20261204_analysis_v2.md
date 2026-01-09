# 🔬 Chrome Performance Trace 종합 분석 보고서 v2.0

**분석 파일**: Trace-20261204.json
**분석 일시**: 2026. 1. 6. 오후 12:12:16
**추적 시간**: 4.72초
**이벤트 수**: 3,253개

---
## 📊 핵심 성능 요약

| 지표 | 값 | 상태 |
|------|-----|------|
| 프레임 드랍율 | 39.3% | 🔴 심각 |
| 평균 프레임 시간 | 44.0ms | 🔴 |
| 최대 프레임 시간 | 700ms | 🔴 |
| Jank 발생 | 4회 | 🟢 |
| Long Task (50ms+) | 12개 | 🟡 |
| 심각한 Long Task (100ms+) | 12개 | 🔴 |
| 강제 Reflow | 0회 | 🟢 |
| GC 총 시간 | 55ms | 🟢 |

---
## ⚠️ 개선 제안 (우선순위순)

### 🔴 [HIGH] Frame Drop
- **문제**: 프레임 드랍율 39.3%
- **해결방안**: 긴 JavaScript 작업을 청크로 분리하거나 Web Worker로 이동하세요.
- *메인 스레드를 16ms 이상 점유하면 프레임이 드랍됩니다.*

### 🔴 [HIGH] Long Task
- **문제**: 심각한 Long Task 12개 (최대 4475ms)
- **해결방안**: Commit 최적화 필요
- *100ms 이상의 작업은 사용자 상호작용을 심하게 방해합니다.*

### 🔴 [HIGH] Bottleneck Function
- **문제**: UpdateLayer에서 4364ms 소요
- **해결방안**: UpdateLayer 함수 최적화 또는 지연 로딩 검토
- *호출 6회, 평균 727.4ms/회*

### 🔴 [HIGH] Bottleneck Function
- **문제**: Commit에서 482ms 소요
- **해결방안**: Commit 함수 최적화 또는 지연 로딩 검토
- *호출 6회, 평균 80.3ms/회*

### 🟡 [MEDIUM] Bottleneck Function
- **문제**: e에서 54ms 소요
- **해결방안**: e 함수 최적화 또는 지연 로딩 검토
- *호출 18회, 평균 3.0ms/회*

---
## 🏷️ 카테고리별 시간 분포

| 카테고리 | 소요 시간 | 비율 |
|----------|-----------|------|
| 🎨 Rendering | 16820ms | 76.9% |
| ⚙️ Other | 4798ms | 21.9% |
| ⚡ Scripting | 200ms | 0.9% |
| 🗑️ GC | 55ms | 0.3% |
| 🖌️ Painting | 2ms | 0.0% |
| 💤 Idle | 0ms | 0.0% |

---
## 📉 문제 집중 발생 구간

| 시작 ~ 종료 | 블로킹 시간 | Task 수 | 주 원인 | 상위 작업 |
|-------------|-------------|---------|---------|-----------|
| 248ms ~ 4723ms | **16812ms** | 12 | Rendering | Commit...<br>UpdateLayer... |

---
## 🐢 병목 함수 TOP 30 (Self Time 기준)

| 순위 | 함수/이벤트 | Self Time | Total Time | 호출수 | 평균 | 카테고리 |
|------|-------------|-----------|------------|--------|------|----------|
| 1 | `UpdateLayer` | **4364.4ms** | 7650.7ms | 6 | 727.40ms | Rendering |
| 2 | `Commit` | **481.8ms** | 9161.2ms | 6 | 80.30ms | Rendering |
| 3 | `e (phaser-iZDVk5aZ.js:1036)` | **54.1ms** | 58.8ms | 18 | 3.01ms | Scripting |
| 4 | `CpuProfiler::StartProfiling` | **45.1ms** | 46.6ms | 1 | 45.05ms | Other |
| 5 | `CppGC.SweepInLowPriorityTask` | **5.8ms** | 6.3ms | 1 | 5.81ms | GC |
| 6 | `V8.HandleInterrupts` | **1.4ms** | 48.0ms | 2 | 0.69ms | Other |
| 7 | `V8.GC_MC_EVACUATE_COPY` | **0.5ms** | 1.0ms | 1 | 0.48ms | GC |
| 8 | `PageAnimator::serviceScriptedAnimations` | **0.3ms** | 59.9ms | 18 | 0.02ms | Other |
| 9 | `WebFrameWidgetImpl::HandleInputEvent` | **0.2ms** | 3.4ms | 3 | 0.07ms | Other |
| 10 | `RunMicrotasks` | **0.2ms** | 1.2ms | 1 | 0.20ms | Scripting |
| 11 | `v8.callFunction` | **0.2ms** | 63.5ms | 21 | 0.01ms | Other |
| 12 | `EvaluateScript` | **0.2ms** | 47.1ms | 1 | 0.17ms | Scripting |
| 13 | `FireAnimationFrame` | **0.1ms** | 59.4ms | 18 | 0.01ms | Scripting |
| 14 | `l (index-CKuq6vec.js:26)` | **0.1ms** | 1.5ms | 1 | 0.07ms | Scripting |
| 15 | `V8.InvokeApiInterruptCallbacks` | **0.0ms** | 46.6ms | 1 | 0.05ms | Other |
| 16 | `WidgetBaseInputHandler::OnHandleInputEvent` | **0.0ms** | 3.4ms | 3 | 0.01ms | Other |
| 17 | `V8.GC_MARK_COMPACTOR` | **0.0ms** | 4.0ms | 1 | 0.04ms | GC |
| 18 | `MajorGC` | **0.0ms** | 4.0ms | 1 | 0.03ms | GC |
| 19 | `TimerFire` | **0.0ms** | 1.5ms | 1 | 0.01ms | Scripting |
| 20 | `V8.GCFinalizeMC` | **0.0ms** | 4.0ms | 1 | 0.01ms | GC |
| 21 | `V8.GC_MC_EVACUATE` | **0.0ms** | 2.5ms | 1 | 0.00ms | GC |
| 22 | `XHRReadyStateChange (unknown)` | **0.0ms** | 3.1ms | 2 | 0.00ms | Other |
| 23 | `V8.StackGuard` | **0.0ms** | 48.0ms | 2 | 0.00ms | Other |
| 24 | `CppGC.IncrementalSweep` | **0.0ms** | 6.3ms | 1 | 0.00ms | GC |

---
## 📁 파일별 스크립트 시간

| 파일명 | Self Time | Total Time | 호출수 |
|--------|-----------|------------|--------|
| `phaser-iZDVk5aZ.js` | **54.1ms** | 58.8ms | 18 |
| `index-CKuq6vec.js` | **0.1ms** | 1.5ms | 1 |
| `unknown` | **0.0ms** | 3.1ms | 2 |

---
## 🗑️ GC (가비지 컬렉션) 분석

- **총 GC 시간**: 55ms
- **GC 발생 횟수**: 472회
- **평균 GC 시간**: 0.1ms

**주요 GC 이벤트:**
| 이벤트 | 소요시간 | 발생 시점 |
|--------|----------|-----------|
| CppGC.IncrementalSweep | **6.3ms** | 2025ms |
| CppGC.SweepInLowPriorityTask | **6.3ms** | 2025ms |
| MajorGC | **4.0ms** | 2021ms |
| V8.GCFinalizeMC | **4.0ms** | 2021ms |
| V8.GC_MARK_COMPACTOR | **4.0ms** | 2021ms |
| V8.GC_MC_EVACUATE | **2.5ms** | 2022ms |
| V8.GC_MC_EVACUATE_COPY | **1.0ms** | 2022ms |
| V8.GC_MC_EVACUATE_UPDATE_POINTERS | **1.0ms** | 2023ms |
| MinorGC | **0.7ms** | 2016ms |
| V8.GCScavenger | **0.7ms** | 2016ms |

---
## 📝 분석 결론

발견된 개선 필요 사항: **5개**
- 🔴 긴급(HIGH): 4개
- 🟡 중요(MEDIUM): 1개

위의 **개선 제안** 섹션을 참고하여 우선순위대로 최적화를 진행하세요.