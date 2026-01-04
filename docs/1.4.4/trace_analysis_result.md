# Chrome Performance Trace 분석 결과

분석 일시: 2026-01-04T15:39:58.551Z

트레이스 파일: Trace-20260105T002129.json


## 📊 요약

- **Long Task (50ms+)**: 32개
- **프레임 드랍 이벤트**: 0개
- **메인 스레드 블로킹**: 5개


## 🔴 Long Tasks (상위 20개)

> 50ms 이상 소요된 작업 - 프레임 드랍의 주요 원인

| # | 이벤트명 | 소요시간 | 타임스탬프 | 카테고리 |
|---|---------|---------|-----------|---------|
| 1 | RunTask | 225.71ms | 4107866ms | disabled-by-default-devtools.timeline |
| 2 | ParseHTML | 225.60ms | 4107866ms | devtools.timeline |
| 3 | EvaluateScript | 220.92ms | 4107867ms | devtools.timeline |
| 4 | ScriptCompiled | 220.76ms | 4107867ms | disabled-by-default-devtools.target-rundown |
| 5 | v8.run | 220.75ms | 4107867ms | v8 |
| 6 | V8.StackGuard | 219.64ms | 4107867ms | v8.execute |
| 7 | V8.HandleInterrupts | 219.64ms | 4107867ms | v8.execute |
| 8 | V8.InvokeApiInterruptCallbacks | 219.64ms | 4107867ms | v8.execute |
| 9 | CpuProfiler::StartProfiling | 219.58ms | 4107867ms | v8 |
| 10 | RunTask | 205.92ms | 4109323ms | disabled-by-default-devtools.timeline |
| 11 | EventDispatch | 205.90ms | 4109323ms | devtools.timeline |
| 12 | v8.callFunction | 205.88ms | 4109323ms | v8 |
| 13 | FunctionCall | 205.83ms | 4109323ms | devtools.timeline |
| 14 | RunTask | 106.60ms | 4109135ms | disabled-by-default-devtools.timeline |
| 15 | v8.evaluateModule | 105.88ms | 4109136ms | v8,devtools.timeline |
| 16 | RunTask | 82.67ms | 4110056ms | disabled-by-default-devtools.timeline |
| 17 | PageAnimator::serviceScriptedAnimations | 81.86ms | 4110056ms | blink,rail |
| 18 | FireAnimationFrame | 81.81ms | 4110056ms | devtools.timeline |
| 19 | v8::Debugger::AsyncTaskRun | 81.81ms | 4110056ms | disabled-by-default-v8.inspector |
| 20 | v8.callFunction | 81.79ms | 4110056ms | v8 |


## 🟡 메인 스레드 블로킹 스크립트

| # | 타입 | 소요시간 | URL |
|---|-----|---------|-----|
| 1 | EvaluateScript | 220.92ms | ...on://dncepekefegjiljlfbihljgogephdhph/inject.js |
| 2 | FunctionCall | 205.83ms | ...://chaosrps.vercel.app/assets/index-CoVTj66G.js |
| 3 | FunctionCall | 81.72ms | ...://chaosrps.vercel.app/assets/index-CoVTj66G.js |
| 4 | EvaluateScript | 61.48ms | ...psfSb,Z5uLle,MdUzUe,zbML3c,zr1jrb,Uas9Hd,pjICDe |
| 5 | EvaluateScript | 53.74ms | ...client/js/2377114275-offline_task_iframe_bin.js |


## 📈 함수별 총 실행 시간 (상위 30개)

| # | 함수명 | 총 시간 | 호출 횟수 | 최대 시간 | 평균 시간 |
|---|-------|--------|----------|----------|----------|
| 1 | RunTask | 18554.39ms | 1810 | 225.71ms | 10.25ms |
| 2 | v8.callFunction | 2424.62ms | 674 | 205.88ms | 3.60ms |
| 3 | FunctionCall | 2091.39ms | 617 | 205.83ms | 3.39ms |
| 4 | v8::Debugger::AsyncTaskRun | 1913.64ms | 636 | 81.81ms | 3.01ms |
| 5 | PageAnimator::serviceScriptedAnimations | 1662.06ms | 586 | 81.86ms | 2.84ms |
| 6 | FireAnimationFrame | 1645.99ms | 586 | 81.81ms | 2.81ms |
| 7 | EvaluateScript | 620.38ms | 20 | 220.92ms | 31.02ms |
| 8 | RunMicrotasks | 496.47ms | 64 | 44.15ms | 7.76ms |
| 9 | ScriptCompiled | 400.08ms | 19 | 220.76ms | 21.06ms |
| 10 | v8.run | 399.75ms | 19 | 220.75ms | 21.04ms |
| 11 | V8.StackGuard | 352.92ms | 9 | 219.64ms | 39.21ms |
| 12 | V8.HandleInterrupts | 352.90ms | 9 | 219.64ms | 39.21ms |
| 13 | V8.InvokeApiInterruptCallbacks | 352.88ms | 9 | 219.64ms | 39.21ms |
| 14 | CpuProfiler::StartProfiling | 351.31ms | 8 | 219.58ms | 43.91ms |
| 15 | ParseHTML | 303.88ms | 5 | 225.60ms | 60.77ms |
| 16 | GPUTask | 286.66ms | 142 | 27.38ms | 2.02ms |
| 17 | EventDispatch | 215.30ms | 5 | 205.90ms | 43.06ms |
| 18 | v8.compile | 194.14ms | 9 | 46.81ms | 21.57ms |
| 19 | BackgroundProcessor::RunScriptStreamingTask | 184.98ms | 5 | 61.07ms | 37.00ms |
| 20 | v8.parseOnBackground | 184.93ms | 5 | 61.06ms | 36.99ms |
| 21 | TimerFire | 117.52ms | 20 | 26.80ms | 5.88ms |
| 22 | v8.evaluateModule | 105.88ms | 1 | 105.88ms | 105.88ms |
| 23 | XHRReadyStateChange | 96.00ms | 15 | 30.13ms | 6.40ms |
| 24 | v8.parseOnBackgroundWaiting | 92.81ms | 23 | 19.46ms | 4.04ms |
| 25 | v8.parseOnBackgroundParsing | 76.23ms | 7 | 35.44ms | 10.89ms |
| 26 | V8.GC_MC_BACKGROUND_MARKING | 61.42ms | 36 | 2.76ms | 1.71ms |
| 27 | MajorGC | 57.74ms | 17 | 6.73ms | 3.40ms |
| 28 | V8.GC_MARK_COMPACTOR | 57.09ms | 17 | 6.70ms | 3.36ms |
| 29 | V8.GCFinalizeMCReduceMemory | 54.38ms | 16 | 6.70ms | 3.40ms |
| 30 | Layout | 53.32ms | 7 | 23.03ms | 7.62ms |


## 💡 분석 결과 기반 권장 사항

이 분석 결과를 바탕으로 개선 계획을 수립합니다.
상세 분석 결과는 implementation_plan.md에서 확인할 수 있습니다.
