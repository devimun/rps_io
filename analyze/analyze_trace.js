/**
 * 🚀 Chrome Performance Trace 종합 분석 도구 v2.0
 * 실행: analyze 폴더에서 node analyze_trace.js
 * 
 * 분석 영역:
 * 1. 프레임 드랍 및 Jank 분석
 * 2. Long Task / Long Animation Frame 분석
 * 3. 스크립팅 병목 (함수/파일별 상세)
 * 4. Layout Thrashing (강제 동기 레이아웃)
 * 5. GC (가비지 컬렉션) 영향
 * 6. 네트워크 요청 분석
 * 7. 메모리 사용 패턴
 * 8. 구체적인 개선 제안
 */

const fs = require('fs');
const path = require('path');

// ⚙️ 분석 설정
const CONFIG = {
  SEARCH_ROOT: path.join(__dirname, '..', 'docs'),
  FRAME_BUDGET_MS: 16.67,     // 60fps 기준
  LONG_TASK_MS: 50,           // Long Task 기준 (Chrome 표준)
  SEVERE_LONG_TASK_MS: 100,   // 심각한 Long Task
  JANK_THRESHOLD_MS: 25,      // 체감 버벅임 임계값
  CLUSTER_GAP_MS: 200,        // 클러스터 간격
  MIN_FUNCTION_TIME_MS: 1,    // 최소 추적 시간
  TOP_BOTTLENECK_COUNT: 30,   // 병목 함수 표시 개수
};

// 🚫 노이즈 필터링
const IGNORED_FUNCTIONS = new Set([
  'RunTask', 'GPUTask', 'ProcessTask', 'ThreadController::RunTask',
  'MessageLoop::RunTask', 'v8::Debugger::AsyncTaskRun', '__unknown__'
]);

const SCRIPTING_EVENTS = new Set([
  'FunctionCall', 'EvaluateScript', 'v8.compile', 'RunMicrotasks',
  'FireAnimationFrame', 'TimerFire', 'EventDispatch', 'RequestAnimationFrame'
]);

const RENDERING_EVENTS = new Set([
  'Layout', 'UpdateLayoutTree', 'RecalculateStyles', 'HitTest',
  'PrePaint', 'Layerize', 'Commit', 'UpdateLayer', 'IntersectionObserverController::computeIntersections'
]);

const PAINTING_EVENTS = new Set([
  'Paint', 'CompositeLayers', 'Rasterize', 'RasterTask', 'DecodeImage', 
  'Decode LazyPixelRef', 'Draw LazyPixelRef', 'ImageDecodeTask'
]);

const GC_EVENTS = new Set([
  'V8.GC', 'MinorGC', 'MajorGC', 'GCEvent', 'V8.GCFinalizeMC',
  'V8.GC_MC_COMPLETE_SWEEPING', 'V8.GC_MC_SWEEP', 'BlinkGC.AtomicPhase',
  'V8.GC_TIME_TO_SAFEPOINT', 'CollectGarbage'
]);

console.log('📊 Chrome Performance Trace 종합 분석 도구 v2.0\n');
console.log(`📂 검색 경로: ${CONFIG.SEARCH_ROOT}\n`);

// 메인
async function main() {
  try {
    const inquirer = await import('inquirer');
    
    if (!fs.existsSync(CONFIG.SEARCH_ROOT)) {
      console.error(`❌ 경로를 찾을 수 없습니다: ${CONFIG.SEARCH_ROOT}`);
      return;
    }

    const allFiles = findTraceFilesRecursively(CONFIG.SEARCH_ROOT);
    if (allFiles.length === 0) {
      console.error('❌ 분석할 Trace 파일이 없습니다.');
      return;
    }

    const choices = allFiles.map(fullPath => ({
      name: path.relative(CONFIG.SEARCH_ROOT, fullPath),
      value: fullPath
    }));

    const answer = await inquirer.default.prompt([{
      type: 'list',
      name: 'selectedFile',
      message: '분석할 트레이스 파일을 선택하세요:',
      choices,
      pageSize: 15
    }]);

    const inputPath = answer.selectedFile;
    const outputFileName = path.basename(inputPath).replace('.json', '_analysis_v2.md');
    const outputPath = path.join(path.dirname(inputPath), outputFileName);

    console.log(`\n🚀 종합 분석 시작: ${path.basename(inputPath)}`);
    await analyzeTraceComprehensively(inputPath, outputPath);

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

// 파일 탐색
function findTraceFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findTraceFilesRecursively(filePath, fileList);
    } else if (file.startsWith('Trace-') && file.endsWith('.json')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// 종합 분석
async function analyzeTraceComprehensively(traceFile, outputFile) {
  const results = {
    // 기본 정보
    traceInfo: { duration: 0, eventCount: 0, startTime: 0, endTime: 0 },
    
    // 프레임 분석
    frameAnalysis: {
      totalFrames: 0,
      droppedFrames: 0,
      avgFrameTime: 0,
      maxFrameTime: 0,
      jankCount: 0,
      fps: { avg: 0, min: 0, percentile95: 0 },
      frameTimings: []
    },
    
    // Long Task 분석
    longTasks: [],
    severeLongTasks: [],
    
    // 함수별 분석
    functionStats: new Map(),
    fileStats: new Map(),
    
    // Layout Thrashing
    layoutThrashing: [],
    forcedReflows: 0,
    
    // GC 분석
    gcEvents: [],
    gcTotalTime: 0,
    gcCount: 0,
    
    // 카테고리별 시간
    categoryTime: {
      scripting: 0,
      rendering: 0,
      painting: 0,
      gc: 0,
      idle: 0,
      other: 0
    },
    
    // 네트워크
    networkRequests: [],
    
    // 문제 구간
    problemZones: [],
    
    // 개선 제안
    suggestions: []
  };

  // 파일 파싱
  const traceData = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
  const events = traceData.traceEvents || [];
  
  // Main Thread 이벤트만 필터링
  const mainThreadEvents = filterMainThreadEvents(events);
  mainThreadEvents.sort((a, b) => a.ts - b.ts);
  
  results.traceInfo.eventCount = mainThreadEvents.length;
  console.log(`📈 총 ${mainThreadEvents.length.toLocaleString()}개의 메인 스레드 이벤트 분석 중...`);

  if (mainThreadEvents.length === 0) {
    console.error('❌ 분석 가능한 이벤트가 없습니다.');
    return;
  }

  results.traceInfo.startTime = mainThreadEvents[0].ts;
  results.traceInfo.endTime = mainThreadEvents[mainThreadEvents.length - 1].ts;
  results.traceInfo.duration = (results.traceInfo.endTime - results.traceInfo.startTime) / 1000;

  // 분석 시작
  analyzeFrameTiming(mainThreadEvents, results);
  analyzeEvents(mainThreadEvents, results);
  analyzeProblems(results);
  generateSuggestions(results);
  
  // 리포트 생성
  generateReport(results, traceFile, outputFile);
}

// Main Thread 필터링
function filterMainThreadEvents(events) {
  // Renderer 프로세스의 CrRendererMain 스레드 찾기
  let mainPid = null;
  let mainTid = null;
  
  for (const event of events) {
    if (event.name === 'thread_name' && event.args?.name === 'CrRendererMain') {
      mainPid = event.pid;
      mainTid = event.tid;
      break;
    }
  }
  
  if (!mainPid || !mainTid) {
    // 폴백: 가장 많은 이벤트가 있는 스레드 사용
    const threadCounts = new Map();
    for (const event of events) {
      if (event.dur > 0) {
        const key = `${event.pid}-${event.tid}`;
        threadCounts.set(key, (threadCounts.get(key) || 0) + 1);
      }
    }
    
    let maxCount = 0;
    for (const [key, count] of threadCounts) {
      if (count > maxCount) {
        maxCount = count;
        [mainPid, mainTid] = key.split('-').map(Number);
      }
    }
  }
  
  return events.filter(e => e.pid === mainPid && e.tid === mainTid && e.dur > 0);
}

// 프레임 타이밍 분석
function analyzeFrameTiming(events, results) {
  const frameEvents = events.filter(e => 
    e.name === 'BeginFrame' || 
    e.name === 'DrawFrame' ||
    e.name === 'FireAnimationFrame'
  );
  
  if (frameEvents.length < 2) {
    // BeginFrame이 없으면 대략적인 프레임 추정
    const chunks = [];
    let currentChunk = { start: events[0].ts, duration: 0 };
    
    for (const event of events) {
      if (event.dur > 0) {
        currentChunk.duration += event.dur / 1000;
        if (currentChunk.duration > CONFIG.FRAME_BUDGET_MS) {
          chunks.push(currentChunk.duration);
          currentChunk = { start: event.ts, duration: 0 };
        }
      }
    }
    
    results.frameAnalysis.frameTimings = chunks;
    results.frameAnalysis.totalFrames = chunks.length || 1;
    return;
  }
  
  const frameTimes = [];
  for (let i = 1; i < frameEvents.length; i++) {
    const delta = (frameEvents[i].ts - frameEvents[i-1].ts) / 1000;
    if (delta < 1000) { // 1초 이상이면 일시정지로 간주
      frameTimes.push(delta);
    }
  }
  
  results.frameAnalysis.frameTimings = frameTimes;
  results.frameAnalysis.totalFrames = frameTimes.length;
  
  if (frameTimes.length > 0) {
    const sorted = [...frameTimes].sort((a, b) => a - b);
    results.frameAnalysis.avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    results.frameAnalysis.maxFrameTime = Math.max(...frameTimes);
    results.frameAnalysis.droppedFrames = frameTimes.filter(t => t > CONFIG.FRAME_BUDGET_MS).length;
    results.frameAnalysis.jankCount = frameTimes.filter(t => t > CONFIG.JANK_THRESHOLD_MS).length;
    
    results.frameAnalysis.fps.avg = 1000 / results.frameAnalysis.avgFrameTime;
    results.frameAnalysis.fps.min = 1000 / Math.max(...frameTimes);
    results.frameAnalysis.fps.percentile95 = 1000 / sorted[Math.floor(sorted.length * 0.95)];
  }
}

// 이벤트 분석
function analyzeEvents(events, results) {
  const initialTs = events[0].ts;
  const callStack = [];
  
  for (const event of events) {
    const durationMs = event.dur / 1000;
    const relativeStartMs = (event.ts - initialTs) / 1000;
    const detailName = getDetailedName(event);
    
    // 카테고리 집계
    if (SCRIPTING_EVENTS.has(event.name)) {
      results.categoryTime.scripting += durationMs;
    } else if (RENDERING_EVENTS.has(event.name)) {
      results.categoryTime.rendering += durationMs;
    } else if (PAINTING_EVENTS.has(event.name)) {
      results.categoryTime.painting += durationMs;
    } else if (GC_EVENTS.has(event.name) || event.name.includes('GC')) {
      results.categoryTime.gc += durationMs;
    } else {
      results.categoryTime.other += durationMs;
    }
    
    // Call Stack 처리 (Self Time 계산용)
    while (callStack.length > 0) {
      const top = callStack[callStack.length - 1];
      if (relativeStartMs >= top.endTime) {
        processFunctionStats(results, top);
        callStack.pop();
      } else {
        break;
      }
    }
    
    if (callStack.length > 0) {
      callStack[callStack.length - 1].childrenDuration += durationMs;
    }
    
    callStack.push({
      event,
      detailName,
      childrenDuration: 0,
      endTime: relativeStartMs + durationMs,
      startTime: relativeStartMs
    });
    
    // Long Task 분석
    if (durationMs >= CONFIG.LONG_TASK_MS && !IGNORED_FUNCTIONS.has(event.name)) {
      const taskInfo = {
        name: detailName,
        duration: durationMs,
        timestamp: relativeStartMs,
        category: classifyCategory(event.name),
        scriptUrl: event.args?.data?.url || null
      };
      
      results.longTasks.push(taskInfo);
      
      if (durationMs >= CONFIG.SEVERE_LONG_TASK_MS) {
        results.severeLongTasks.push(taskInfo);
      }
    }
    
    // Layout Thrashing 감지
    if (RENDERING_EVENTS.has(event.name) && durationMs > 1) {
      const isInsideScript = callStack.some(item => 
        SCRIPTING_EVENTS.has(item.event.name)
      );
      
      if (isInsideScript) {
        const culprit = [...callStack].reverse().find(item => 
          item.event.name === 'FunctionCall' || item.event.name === 'EvaluateScript'
        );
        
        results.layoutThrashing.push({
          name: event.name,
          duration: durationMs,
          timestamp: relativeStartMs,
          initiator: culprit ? getDetailedName(culprit.event) : 'unknown',
          scriptUrl: culprit?.event?.args?.data?.url || null
        });
        
        if (event.name === 'Layout') {
          results.forcedReflows++;
        }
      }
    }
    
    // GC 분석
    if (GC_EVENTS.has(event.name) || event.name.includes('GC')) {
      results.gcEvents.push({
        name: event.name,
        duration: durationMs,
        timestamp: relativeStartMs
      });
      results.gcTotalTime += durationMs;
      results.gcCount++;
    }
    
    // 네트워크 요청
    if (event.name === 'ResourceSendRequest' || event.name === 'XHRReadyStateChange') {
      results.networkRequests.push({
        name: event.args?.data?.url || event.name,
        timestamp: relativeStartMs
      });
    }
  }
  
  // 남은 스택 처리
  while (callStack.length > 0) {
    processFunctionStats(results, callStack.pop());
  }
}

// 함수 통계 처리
function processFunctionStats(results, stackItem) {
  const { event, detailName, childrenDuration } = stackItem;
  
  if (!event.name || !event.dur) return;
  if (IGNORED_FUNCTIONS.has(event.name)) return;
  
  const durationMs = event.dur / 1000;
  if (durationMs < CONFIG.MIN_FUNCTION_TIME_MS) return;
  
  const selfTime = Math.max(0, durationMs - childrenDuration);
  const key = detailName || event.name;
  
  // 함수별 통계
  const stats = results.functionStats.get(key) || {
    totalTime: 0,
    selfTime: 0,
    count: 0,
    maxTime: 0,
    category: classifyCategory(event.name)
  };
  
  stats.totalTime += durationMs;
  stats.selfTime += selfTime;
  stats.count++;
  stats.maxTime = Math.max(stats.maxTime, durationMs);
  
  results.functionStats.set(key, stats);
  
  // 파일별 통계
  const url = event.args?.data?.url;
  if (url) {
    const fileName = extractFileName(url);
    const fileStats = results.fileStats.get(fileName) || {
      totalTime: 0,
      selfTime: 0,
      count: 0,
      url: url
    };
    
    fileStats.totalTime += durationMs;
    fileStats.selfTime += selfTime;
    fileStats.count++;
    
    results.fileStats.set(fileName, fileStats);
  }
}

// 문제 구간 분석
function analyzeProblems(results) {
  // Long Task 클러스터링
  const sortedTasks = [...results.longTasks].sort((a, b) => a.timestamp - b.timestamp);
  const clusters = [];
  
  if (sortedTasks.length > 0) {
    let currentCluster = {
      start: sortedTasks[0].timestamp,
      end: sortedTasks[0].timestamp + sortedTasks[0].duration,
      tasks: [sortedTasks[0]],
      totalDuration: sortedTasks[0].duration
    };
    
    for (let i = 1; i < sortedTasks.length; i++) {
      const task = sortedTasks[i];
      const gap = task.timestamp - currentCluster.end;
      
      if (gap < CONFIG.CLUSTER_GAP_MS) {
        currentCluster.end = Math.max(currentCluster.end, task.timestamp + task.duration);
        currentCluster.tasks.push(task);
        currentCluster.totalDuration += task.duration;
      } else {
        clusters.push(currentCluster);
        currentCluster = {
          start: task.timestamp,
          end: task.timestamp + task.duration,
          tasks: [task],
          totalDuration: task.duration
        };
      }
    }
    clusters.push(currentCluster);
  }
  
  // 문제 구간 식별
  for (const cluster of clusters) {
    if (cluster.totalDuration > CONFIG.SEVERE_LONG_TASK_MS || cluster.tasks.length > 2) {
      const categoryCount = {};
      for (const task of cluster.tasks) {
        categoryCount[task.category] = (categoryCount[task.category] || 0) + 1;
      }
      
      results.problemZones.push({
        startMs: cluster.start,
        endMs: cluster.end,
        durationMs: cluster.end - cluster.start,
        taskCount: cluster.tasks.length,
        totalBlockTime: cluster.totalDuration,
        primaryCategory: Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
        topTasks: cluster.tasks
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
      });
    }
  }
}

// 개선 제안 생성
function generateSuggestions(results) {
  const suggestions = results.suggestions;
  
  // 1. 프레임 드랍 관련
  if (results.frameAnalysis.droppedFrames > results.frameAnalysis.totalFrames * 0.1) {
    suggestions.push({
      priority: 'HIGH',
      category: 'Frame Drop',
      issue: `프레임 드랍율 ${((results.frameAnalysis.droppedFrames / results.frameAnalysis.totalFrames) * 100).toFixed(1)}%`,
      solution: '긴 JavaScript 작업을 청크로 분리하거나 Web Worker로 이동하세요.',
      detail: '메인 스레드를 16ms 이상 점유하면 프레임이 드랍됩니다.'
    });
  }
  
  // 2. Long Task 관련
  if (results.severeLongTasks.length > 0) {
    const topTask = results.severeLongTasks[0];
    suggestions.push({
      priority: 'HIGH',
      category: 'Long Task',
      issue: `심각한 Long Task ${results.severeLongTasks.length}개 (최대 ${topTask.duration.toFixed(0)}ms)`,
      solution: `${topTask.name.split('(')[0].trim()} 최적화 필요`,
      detail: '100ms 이상의 작업은 사용자 상호작용을 심하게 방해합니다.'
    });
  }
  
  // 3. GC 관련
  if (results.gcTotalTime > results.traceInfo.duration * 0.05) {
    suggestions.push({
      priority: 'MEDIUM',
      category: 'Garbage Collection',
      issue: `GC에 ${results.gcTotalTime.toFixed(0)}ms 소요 (${(results.gcTotalTime / results.traceInfo.duration * 100).toFixed(1)}%)`,
      solution: '객체 풀링 패턴 적용, 불필요한 객체 생성 줄이기',
      detail: '자주 발생하는 GC는 프레임 드랍의 주요 원인입니다.'
    });
  }
  
  // 4. Layout Thrashing 관련
  if (results.forcedReflows > 5) {
    suggestions.push({
      priority: 'MEDIUM',
      category: 'Layout Thrashing',
      issue: `강제 동기 레이아웃 ${results.forcedReflows}회`,
      solution: 'DOM 읽기/쓰기 분리, requestAnimationFrame 사용',
      detail: '스크립트 내에서 Layout이 발생하면 강제 동기 레이아웃이 됩니다.'
    });
  }
  
  // 5. 스크립팅 비중
  if (results.categoryTime.scripting > results.traceInfo.duration * 0.7) {
    suggestions.push({
      priority: 'MEDIUM',
      category: 'Scripting Heavy',
      issue: `스크립팅이 전체의 ${(results.categoryTime.scripting / results.traceInfo.duration * 100).toFixed(0)}%`,
      solution: '핫 함수 최적화, 컴포넌트 레벨 코드 스플리팅',
      detail: '스크립팅 비중이 너무 높으면 렌더링에 시간이 부족합니다.'
    });
  }
  
  // 6. 상위 병목 함수 기반 제안
  const topFunctions = [...results.functionStats.entries()]
    .filter(([name]) => !IGNORED_FUNCTIONS.has(name.split(' ')[0]))
    .sort((a, b) => b[1].selfTime - a[1].selfTime)
    .slice(0, 3);
  
  for (const [name, stats] of topFunctions) {
    if (stats.selfTime > 50) {
      const shortName = name.split('(')[0].trim();
      suggestions.push({
        priority: stats.selfTime > 200 ? 'HIGH' : 'MEDIUM',
        category: 'Bottleneck Function',
        issue: `${shortName}에서 ${stats.selfTime.toFixed(0)}ms 소요`,
        solution: `${shortName} 함수 최적화 또는 지연 로딩 검토`,
        detail: `호출 ${stats.count}회, 평균 ${(stats.selfTime / stats.count).toFixed(1)}ms/회`
      });
    }
  }
}

// 리포트 생성
function generateReport(results, inputFile, outputFile) {
  const lines = [];
  
  // 헤더
  lines.push('# 🔬 Chrome Performance Trace 종합 분석 보고서 v2.0');
  lines.push('');
  lines.push(`**분석 파일**: ${path.basename(inputFile)}`);
  lines.push(`**분석 일시**: ${new Date().toLocaleString('ko-KR')}`);
  lines.push(`**추적 시간**: ${(results.traceInfo.duration / 1000).toFixed(2)}초`);
  lines.push(`**이벤트 수**: ${results.traceInfo.eventCount.toLocaleString()}개`);
  lines.push('');
  
  // 🚨 핵심 요약
  lines.push('---');
  lines.push('## 📊 핵심 성능 요약');
  lines.push('');
  
  const dropRate = (results.frameAnalysis.droppedFrames / Math.max(1, results.frameAnalysis.totalFrames) * 100);
  const status = dropRate > 20 ? '🔴 심각' : dropRate > 10 ? '🟡 주의' : '🟢 양호';
  
  lines.push(`| 지표 | 값 | 상태 |`);
  lines.push(`|------|-----|------|`);
  lines.push(`| 프레임 드랍율 | ${dropRate.toFixed(1)}% | ${status} |`);
  lines.push(`| 평균 프레임 시간 | ${results.frameAnalysis.avgFrameTime.toFixed(1)}ms | ${results.frameAnalysis.avgFrameTime > 16.7 ? '🔴' : '🟢'} |`);
  lines.push(`| 최대 프레임 시간 | ${results.frameAnalysis.maxFrameTime.toFixed(0)}ms | ${results.frameAnalysis.maxFrameTime > 100 ? '🔴' : '🟡'} |`);
  lines.push(`| Jank 발생 | ${results.frameAnalysis.jankCount}회 | ${results.frameAnalysis.jankCount > 10 ? '🔴' : '🟢'} |`);
  lines.push(`| Long Task (50ms+) | ${results.longTasks.length}개 | ${results.longTasks.length > 5 ? '🟡' : '🟢'} |`);
  lines.push(`| 심각한 Long Task (100ms+) | ${results.severeLongTasks.length}개 | ${results.severeLongTasks.length > 0 ? '🔴' : '🟢'} |`);
  lines.push(`| 강제 Reflow | ${results.forcedReflows}회 | ${results.forcedReflows > 5 ? '🟡' : '🟢'} |`);
  lines.push(`| GC 총 시간 | ${results.gcTotalTime.toFixed(0)}ms | ${results.gcTotalTime > 100 ? '🟡' : '🟢'} |`);
  lines.push('');
  
  // ⚠️ 개선 제안
  if (results.suggestions.length > 0) {
    lines.push('---');
    lines.push('## ⚠️ 개선 제안 (우선순위순)');
    lines.push('');
    
    const sortedSuggestions = results.suggestions.sort((a, b) => {
      const priority = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priority[a.priority] - priority[b.priority];
    });
    
    for (const s of sortedSuggestions) {
      const icon = s.priority === 'HIGH' ? '🔴' : s.priority === 'MEDIUM' ? '🟡' : '🟢';
      lines.push(`### ${icon} [${s.priority}] ${s.category}`);
      lines.push(`- **문제**: ${s.issue}`);
      lines.push(`- **해결방안**: ${s.solution}`);
      lines.push(`- *${s.detail}*`);
      lines.push('');
    }
  }
  
  // 🏷️ 카테고리별 시간 분포
  lines.push('---');
  lines.push('## 🏷️ 카테고리별 시간 분포');
  lines.push('');
  
  const totalCategoryTime = Object.values(results.categoryTime).reduce((a, b) => a + b, 0);
  const catSorted = Object.entries(results.categoryTime)
    .sort((a, b) => b[1] - a[1]);
  
  lines.push('| 카테고리 | 소요 시간 | 비율 |');
  lines.push('|----------|-----------|------|');
  for (const [cat, time] of catSorted) {
    const pct = (time / totalCategoryTime * 100).toFixed(1);
    const catName = {
      scripting: '⚡ Scripting',
      rendering: '🎨 Rendering',
      painting: '🖌️ Painting',
      gc: '🗑️ GC',
      idle: '💤 Idle',
      other: '⚙️ Other'
    }[cat] || cat;
    lines.push(`| ${catName} | ${time.toFixed(0)}ms | ${pct}% |`);
  }
  lines.push('');
  
  // 📉 문제 구간
  if (results.problemZones.length > 0) {
    lines.push('---');
    lines.push('## 📉 문제 집중 발생 구간');
    lines.push('');
    lines.push('| 시작 ~ 종료 | 블로킹 시간 | Task 수 | 주 원인 | 상위 작업 |');
    lines.push('|-------------|-------------|---------|---------|-----------|');
    
    for (const zone of results.problemZones.slice(0, 10)) {
      const tasks = zone.topTasks.slice(0, 2)
        .map(t => `${t.name.slice(0, 30)}...`)
        .join('<br>');
      
      lines.push(`| ${zone.startMs.toFixed(0)}ms ~ ${zone.endMs.toFixed(0)}ms | **${zone.totalBlockTime.toFixed(0)}ms** | ${zone.taskCount} | ${zone.primaryCategory} | ${tasks || '-'} |`);
    }
    lines.push('');
  }
  
  // 🐢 병목 함수 TOP
  lines.push('---');
  lines.push(`## 🐢 병목 함수 TOP ${CONFIG.TOP_BOTTLENECK_COUNT} (Self Time 기준)`);
  lines.push('');
  lines.push('| 순위 | 함수/이벤트 | Self Time | Total Time | 호출수 | 평균 | 카테고리 |');
  lines.push('|------|-------------|-----------|------------|--------|------|----------|');
  
  const topFuncs = [...results.functionStats.entries()]
    .filter(([name]) => !IGNORED_FUNCTIONS.has(name.split(' ')[0]))
    .sort((a, b) => b[1].selfTime - a[1].selfTime)
    .slice(0, CONFIG.TOP_BOTTLENECK_COUNT);
  
  topFuncs.forEach(([name, stats], i) => {
    const avgMs = (stats.selfTime / stats.count).toFixed(2);
    const shortName = name.length > 50 ? name.slice(0, 47) + '...' : name;
    lines.push(`| ${i + 1} | \`${shortName}\` | **${stats.selfTime.toFixed(1)}ms** | ${stats.totalTime.toFixed(1)}ms | ${stats.count} | ${avgMs}ms | ${stats.category} |`);
  });
  lines.push('');
  
  // 📁 파일별 분석
  if (results.fileStats.size > 0) {
    lines.push('---');
    lines.push('## 📁 파일별 스크립트 시간');
    lines.push('');
    lines.push('| 파일명 | Self Time | Total Time | 호출수 |');
    lines.push('|--------|-----------|------------|--------|');
    
    const topFiles = [...results.fileStats.entries()]
      .sort((a, b) => b[1].selfTime - a[1].selfTime)
      .slice(0, 15);
    
    for (const [name, stats] of topFiles) {
      lines.push(`| \`${name}\` | **${stats.selfTime.toFixed(1)}ms** | ${stats.totalTime.toFixed(1)}ms | ${stats.count} |`);
    }
    lines.push('');
  }
  
  // 🔄 Layout Thrashing
  if (results.layoutThrashing.length > 0) {
    lines.push('---');
    lines.push('## 🔄 Layout Thrashing (강제 동기 레이아웃)');
    lines.push('');
    lines.push('| # | 레이아웃 이벤트 | 소요시간 | 발생 시점 | 유발 스크립트 |');
    lines.push('|---|-----------------|----------|-----------|---------------|');
    
    const sortedThrash = [...results.layoutThrashing]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 15);
    
    sortedThrash.forEach((item, i) => {
      const shortInit = item.initiator.length > 40 ? item.initiator.slice(0, 37) + '...' : item.initiator;
      lines.push(`| ${i + 1} | ${item.name} | **${item.duration.toFixed(1)}ms** | ${item.timestamp.toFixed(0)}ms | \`${shortInit}\` |`);
    });
    lines.push('');
  }
  
  // 🗑️ GC 분석
  if (results.gcEvents.length > 0) {
    lines.push('---');
    lines.push('## 🗑️ GC (가비지 컬렉션) 분석');
    lines.push('');
    lines.push(`- **총 GC 시간**: ${results.gcTotalTime.toFixed(0)}ms`);
    lines.push(`- **GC 발생 횟수**: ${results.gcCount}회`);
    lines.push(`- **평균 GC 시간**: ${(results.gcTotalTime / Math.max(1, results.gcCount)).toFixed(1)}ms`);
    lines.push('');
    
    const topGc = [...results.gcEvents]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    if (topGc.length > 0 && topGc[0].duration > 5) {
      lines.push('**주요 GC 이벤트:**');
      lines.push('| 이벤트 | 소요시간 | 발생 시점 |');
      lines.push('|--------|----------|-----------|');
      for (const gc of topGc) {
        lines.push(`| ${gc.name} | **${gc.duration.toFixed(1)}ms** | ${gc.timestamp.toFixed(0)}ms |`);
      }
      lines.push('');
    }
  }
  
  // 🔚 결론
  lines.push('---');
  lines.push('## 📝 분석 결론');
  lines.push('');
  
  if (results.suggestions.length === 0) {
    lines.push('✅ 심각한 성능 문제가 발견되지 않았습니다.');
  } else {
    const highCount = results.suggestions.filter(s => s.priority === 'HIGH').length;
    const medCount = results.suggestions.filter(s => s.priority === 'MEDIUM').length;
    
    lines.push(`발견된 개선 필요 사항: **${results.suggestions.length}개**`);
    if (highCount > 0) lines.push(`- 🔴 긴급(HIGH): ${highCount}개`);
    if (medCount > 0) lines.push(`- 🟡 중요(MEDIUM): ${medCount}개`);
    lines.push('');
    lines.push('위의 **개선 제안** 섹션을 참고하여 우선순위대로 최적화를 진행하세요.');
  }
  
  // 저장
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
  
  console.log(`\n✨ 분석 완료! 결과 파일: ${path.basename(outputFile)}`);
  console.log('='.repeat(60));
  console.log('[핵심 지표]');
  console.log(`  프레임 드랍율: ${dropRate.toFixed(1)}%`);
  console.log(`  Long Task: ${results.longTasks.length}개 (심각: ${results.severeLongTasks.length}개)`);
  console.log(`  개선 제안: ${results.suggestions.length}개`);
  console.log('='.repeat(60));
}

// 유틸: 상세 이름 추출
function getDetailedName(event) {
  let name = event.name;
  const data = event.args?.data;
  
  if (data) {
    if (data.functionName) {
      name = `${data.functionName}`;
      if (data.url && data.lineNumber !== undefined) {
        const fileName = extractFileName(data.url);
        name += ` (${fileName}:${data.lineNumber})`;
      }
    } else if (data.url && data.lineNumber !== undefined) {
      const fileName = extractFileName(data.url);
      name = `${name} (${fileName}:${data.lineNumber})`;
    } else if (data.url) {
      const fileName = extractFileName(data.url);
      name = `${name} (${fileName})`;
    } else if (data.scriptName) {
      name = `${name} (${data.scriptName})`;
    }
  }
  
  return name;
}

// 유틸: 파일명 추출
function extractFileName(url) {
  if (!url) return 'unknown';
  try {
    const parts = url.split('/');
    let fileName = parts[parts.length - 1] || 'index';
    // 쿼리 스트링 제거
    fileName = fileName.split('?')[0];
    return fileName || 'unknown';
  } catch {
    return 'unknown';
  }
}

// 유틸: 카테고리 분류
function classifyCategory(eventName) {
  if (SCRIPTING_EVENTS.has(eventName)) return 'Scripting';
  if (RENDERING_EVENTS.has(eventName)) return 'Rendering';
  if (PAINTING_EVENTS.has(eventName)) return 'Painting';
  if (GC_EVENTS.has(eventName) || eventName.includes('GC')) return 'GC';
  return 'Other';
}

main();