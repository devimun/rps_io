/**
 * Chrome Performance Trace 분석 스크립트
 * 프레임 드랍 및 Long Task 지점을 추출합니다.
 * 
 * 사용법: node analyze_trace.js
 */

const fs = require('fs');
const path = require('path');

const TRACE_FILE = path.join(__dirname, 'Trace-20260105T002129.json');
const OUTPUT_FILE = path.join(__dirname, 'trace_analysis_result.md');

// Long Task 임계값 (밀리초)
const LONG_TASK_THRESHOLD_MS = 50;

// 프레임 드랍 임계값 (60fps 기준 16.67ms, 30fps 드랍 = 33ms 이상)
const FRAME_DROP_THRESHOLD_MS = 33;

console.log('📊 Chrome Performance Trace 분석 시작...\n');

// 스트림 방식으로 대용량 JSON 파싱
async function analyzeTrace() {
  const results = {
    longTasks: [],
    frameDrops: [],
    slowFunctions: new Map(),
    mainThreadBlockings: [],
    totalDuration: 0,
    startTime: 0,
    endTime: 0,
  };

  console.log('📁 트레이스 파일 읽는 중...');
  const data = fs.readFileSync(TRACE_FILE, 'utf-8');
  
  console.log('🔍 JSON 파싱 중 (대용량 파일, 잠시 대기)...');
  const trace = JSON.parse(data);
  
  const events = trace.traceEvents || [];
  console.log(`📈 총 ${events.length.toLocaleString()}개의 이벤트 분석 중...\n`);

  let processedCount = 0;
  const progressInterval = Math.floor(events.length / 10);

  // 메인 렌더러 프로세스 찾기 (chaosrps.vercel.app)
  const rendererPids = new Set();
  
  // 1단계: 렌더러 프로세스 식별
  for (const event of events) {
    if (event.name === 'process_name' && event.args?.name === 'Renderer') {
      rendererPids.add(event.pid);
    }
  }

  // 2단계: 이벤트 분석
  for (const event of events) {
    processedCount++;
    if (processedCount % progressInterval === 0) {
      const percent = Math.round((processedCount / events.length) * 100);
      process.stdout.write(`\r진행률: ${percent}%`);
    }

    // duration이 있는 이벤트만 분석
    if (!event.dur) continue;

    const durationMs = event.dur / 1000; // 마이크로초 -> 밀리초

    // Long Task 감지 (50ms 이상)
    if (durationMs >= LONG_TASK_THRESHOLD_MS) {
      results.longTasks.push({
        name: event.name,
        duration: durationMs,
        timestamp: event.ts / 1000, // 밀리초로 변환
        pid: event.pid,
        tid: event.tid,
        category: event.cat,
        args: event.args,
      });
    }

    // 함수별 총 실행 시간 집계
    if (event.name && durationMs > 1) {
      const key = event.name;
      const current = results.slowFunctions.get(key) || { 
        totalTime: 0, 
        count: 0, 
        maxTime: 0 
      };
      current.totalTime += durationMs;
      current.count++;
      current.maxTime = Math.max(current.maxTime, durationMs);
      results.slowFunctions.set(key, current);
    }

    // Layout/Paint 이벤트 (프레임 드랍 관련)
    if (['Layout', 'Paint', 'UpdateLayoutTree', 'HitTest', 'RecalculateStyles'].includes(event.name)) {
      if (durationMs >= FRAME_DROP_THRESHOLD_MS) {
        results.frameDrops.push({
          name: event.name,
          duration: durationMs,
          timestamp: event.ts / 1000,
        });
      }
    }

    // 스크립트 실행 (EvaluateScript, v8.compile 등)
    if (event.name === 'EvaluateScript' || event.name === 'FunctionCall') {
      if (durationMs >= LONG_TASK_THRESHOLD_MS) {
        results.mainThreadBlockings.push({
          name: event.name,
          duration: durationMs,
          timestamp: event.ts / 1000,
          url: event.args?.data?.url || 'unknown',
        });
      }
    }
  }

  console.log('\n\n✅ 분석 완료!\n');

  // 결과 정렬 (duration 내림차순)
  results.longTasks.sort((a, b) => b.duration - a.duration);
  results.frameDrops.sort((a, b) => b.duration - a.duration);
  results.mainThreadBlockings.sort((a, b) => b.duration - a.duration);

  // 함수별 실행 시간 정렬
  const sortedFunctions = [...results.slowFunctions.entries()]
    .sort((a, b) => b[1].totalTime - a[1].totalTime)
    .slice(0, 50); // 상위 50개

  // 결과 출력
  generateReport(results, sortedFunctions);
}

function generateReport(results, sortedFunctions) {
  const lines = [];
  
  lines.push('# Chrome Performance Trace 분석 결과\n');
  lines.push(`분석 일시: ${new Date().toISOString()}\n`);
  lines.push(`트레이스 파일: Trace-20260105T002129.json\n\n`);

  // 요약
  lines.push('## 📊 요약\n');
  lines.push(`- **Long Task (50ms+)**: ${results.longTasks.length}개`);
  lines.push(`- **프레임 드랍 이벤트**: ${results.frameDrops.length}개`);
  lines.push(`- **메인 스레드 블로킹**: ${results.mainThreadBlockings.length}개\n`);

  // Long Tasks (상위 20개)
  lines.push('\n## 🔴 Long Tasks (상위 20개)\n');
  lines.push('> 50ms 이상 소요된 작업 - 프레임 드랍의 주요 원인\n');
  lines.push('| # | 이벤트명 | 소요시간 | 타임스탬프 | 카테고리 |');
  lines.push('|---|---------|---------|-----------|---------|');
  
  results.longTasks.slice(0, 20).forEach((task, i) => {
    lines.push(`| ${i + 1} | ${task.name} | ${task.duration.toFixed(2)}ms | ${task.timestamp.toFixed(0)}ms | ${task.category || '-'} |`);
  });

  // 프레임 드랍 이벤트
  if (results.frameDrops.length > 0) {
    lines.push('\n\n## 🟠 프레임 드랍 유발 이벤트\n');
    lines.push('| # | 이벤트명 | 소요시간 | 타임스탬프 |');
    lines.push('|---|---------|---------|-----------|');
    
    results.frameDrops.slice(0, 10).forEach((drop, i) => {
      lines.push(`| ${i + 1} | ${drop.name} | ${drop.duration.toFixed(2)}ms | ${drop.timestamp.toFixed(0)}ms |`);
    });
  }

  // 메인 스레드 블로킹
  if (results.mainThreadBlockings.length > 0) {
    lines.push('\n\n## 🟡 메인 스레드 블로킹 스크립트\n');
    lines.push('| # | 타입 | 소요시간 | URL |');
    lines.push('|---|-----|---------|-----|');
    
    results.mainThreadBlockings.slice(0, 15).forEach((block, i) => {
      const shortUrl = block.url.length > 50 
        ? '...' + block.url.slice(-47) 
        : block.url;
      lines.push(`| ${i + 1} | ${block.name} | ${block.duration.toFixed(2)}ms | ${shortUrl} |`);
    });
  }

  // 함수별 총 실행 시간
  lines.push('\n\n## 📈 함수별 총 실행 시간 (상위 30개)\n');
  lines.push('| # | 함수명 | 총 시간 | 호출 횟수 | 최대 시간 | 평균 시간 |');
  lines.push('|---|-------|--------|----------|----------|----------|');
  
  sortedFunctions.slice(0, 30).forEach(([name, stats], i) => {
    const avgTime = stats.totalTime / stats.count;
    lines.push(`| ${i + 1} | ${name} | ${stats.totalTime.toFixed(2)}ms | ${stats.count} | ${stats.maxTime.toFixed(2)}ms | ${avgTime.toFixed(2)}ms |`);
  });

  // 권장 개선 사항
  lines.push('\n\n## 💡 분석 결과 기반 권장 사항\n');
  lines.push('이 분석 결과를 바탕으로 개선 계획을 수립합니다.');
  lines.push('상세 분석 결과는 implementation_plan.md에서 확인할 수 있습니다.\n');

  const report = lines.join('\n');
  
  // 파일 저장
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
  console.log(`📝 분석 결과 저장: ${OUTPUT_FILE}\n`);
  
  // 콘솔에도 요약 출력
  console.log('='.repeat(60));
  console.log('📊 분석 요약');
  console.log('='.repeat(60));
  console.log(`Long Task (50ms+): ${results.longTasks.length}개`);
  console.log(`프레임 드랍 이벤트: ${results.frameDrops.length}개`);
  console.log(`메인 스레드 블로킹: ${results.mainThreadBlockings.length}개`);
  
  if (results.longTasks.length > 0) {
    console.log('\n🔴 가장 긴 Long Tasks (상위 5개):');
    results.longTasks.slice(0, 5).forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.name}: ${task.duration.toFixed(2)}ms`);
    });
  }
  
  if (sortedFunctions.length > 0) {
    console.log('\n📈 가장 많은 시간을 소비한 함수 (상위 5개):');
    sortedFunctions.slice(0, 5).forEach(([name, stats], i) => {
      console.log(`  ${i + 1}. ${name}: ${stats.totalTime.toFixed(2)}ms (${stats.count}회)`);
    });
  }
}

// 실행
analyzeTrace().catch(err => {
  console.error('❌ 분석 중 오류 발생:', err.message);
  process.exit(1);
});
