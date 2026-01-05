/**
 * 🚀 Chrome Performance Trace 심층 분석 도구 (Detail Fix)
 * 실행 위치: /rps_io/analyze 폴더 안에서 node analyze_trace.js
 * 기능: RunTask 같은 껍데기 함수 제외 + 스크립트 파일명/줄번호 상세 추적
 */

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

// ⚙️ 분석 설정값
const CONFIG = {
  SEARCH_ROOT: path.join(__dirname, '..', 'docs'), 
  FRAME_BUDGET_MS: 16.7, 
  LONG_TASK_THRESHOLD_MS: 25,
  CLUSTER_THRESHOLD_MS: 500
};

// 🚫 분석에서 제외할 '껍데기' 함수들 (노이즈 필터)
const IGNORED_FUNCTIONS = new Set([
  'RunTask', 'GPUTask', 'ProcessTask', 'ThreadController::RunTask', 
  'MessageLoop::RunTask', 'v8::Debugger::AsyncTaskRun'
]);

console.log('📊 Chrome Performance Trace 분석 도구 (Detail Tracking)\n');
console.log(`📂 검색 루트: ${CONFIG.SEARCH_ROOT}\n`);

// 📂 하위 폴더 재귀 탐색
function findTraceFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findTraceFilesRecursively(filePath, fileList);
    } else {
      if (file.startsWith('Trace-') && file.endsWith('.json')) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

// 🏷️ 이벤트 상세 이름 추출 (예: FunctionCall -> game.js:10)
function getDetailedName(event) {
  let name = event.name;

  // 스크립트 실행 관련 이벤트면 파일명/URL 찾기
  if (['FunctionCall', 'EvaluateScript', 'v8.compile'].includes(name)) {
    const data = event.args?.data;
    if (data) {
      if (data.url && data.lineNumber != undefined) {
        // 긴 URL은 파일명만 남김
        const fileName = data.url.split('/').pop() || data.url;
        name = `${name} (${fileName}:${data.lineNumber})`;
      } else if (data.url) {
        const fileName = data.url.split('/').pop();
        name = `${name} (${fileName})`;
      } else if (data.scriptName) {
        name = `${name} (${data.scriptName})`;
      }
    }
  }
  
  // 타이머 관련
  if (name === 'TimerFire' || name === 'FireAnimationFrame') {
    const data = event.args?.data;
    if (data && data.frame) {
      name = `${name} (Frame: ${data.frame})`;
    }
  }

  return name;
}

// 메인 실행 함수
async function main() {
  try {
    if (!fs.existsSync(CONFIG.SEARCH_ROOT)) {
      console.error(`❌ 경로를 찾을 수 없습니다: ${CONFIG.SEARCH_ROOT}`);
      return;
    }

    const allFiles = findTraceFilesRecursively(CONFIG.SEARCH_ROOT);

    if (allFiles.length === 0) {
      console.error(`❌ 분석할 파일이 없습니다.`);
      return;
    }

    const choices = allFiles.map(fullPath => {
      const relativePath = path.relative(CONFIG.SEARCH_ROOT, fullPath);
      return { name: relativePath, value: fullPath };
    });

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedFile',
        message: '분석할 트레이스 파일을 선택해주세요:',
        choices: choices,
        pageSize: 15
      }
    ]);

    const inputPath = answer.selectedFile;
    const outputFileName = path.basename(inputPath).replace('.json', '_report.md');
    const outputPath = path.join(path.dirname(inputPath), outputFileName);

    console.log(`\n🚀 심층 분석 시작: ${path.basename(inputPath)}`);
    
    await analyzeTraceDeep(inputPath, outputPath);

  } catch (error) {
    console.error('❌ 실행 중 오류 발생:', error);
  }
}

// 심층 분석 로직
async function analyzeTraceDeep(traceFile, outputFile) {
  const results = {
    longTasks: [],
    droppedFrames: [],
    slowFunctions: new Map(),
    layoutThrashing: [],
    categorySummary: { Scripting: 0, Rendering: 0, Painting: 0, System: 0 },
  };

  const traceData = JSON.parse(fs.readFileSync(traceFile, 'utf-8'));
  const events = traceData.traceEvents || [];
  
  events.sort((a, b) => a.ts - b.ts);
  console.log(`📈 총 ${events.length.toLocaleString()}개의 이벤트 처리 중...`);

  const initialTs = events.length > 0 ? events[0].ts : 0;
  const callStack = [];

  for (const event of events) {
    if (!event.dur && !event.ph) continue;

    const durationMs = (event.dur || 0) / 1000;
    const relativeStartTimeMs = (event.ts - initialTs) / 1000; 
    const detailName = getDetailedName(event); // 상세 이름 사용

    // [1] 카테고리 집계
    if (durationMs > 0) {
      if (['EvaluateScript', 'FunctionCall', 'v8.compile', 'RunMicrotasks', 'FireAnimationFrame'].includes(event.name)) {
        results.categorySummary.Scripting += durationMs;
      } else if (['Layout', 'UpdateLayoutTree', 'RecalculateStyles', 'HitTest'].includes(event.name)) {
        results.categorySummary.Rendering += durationMs;
      } else if (['Paint', 'CompositeLayers', 'Decode Image'].includes(event.name)) {
        results.categorySummary.Painting += durationMs;
      } else {
        results.categorySummary.System += durationMs;
      }
    }

    // [2] Call Stack & Self Time
    while (callStack.length > 0) {
      const top = callStack[callStack.length - 1];
      if (relativeStartTimeMs >= top.endTime) {
        processFunctionStats(results, top.event, top.childrenDuration, top.detailName);
        callStack.pop();
      } else {
        break;
      }
    }

    if (durationMs > 0) {
      if (callStack.length > 0) {
        callStack[callStack.length - 1].childrenDuration += durationMs;
      }
      callStack.push({ event, childrenDuration: 0, endTime: relativeStartTimeMs + durationMs, detailName: detailName });
    }

    // [3] Layout Thrashing
    if (['Layout', 'UpdateLayoutTree', 'RecalculateStyles'].includes(event.name)) {
       const isInsideScript = callStack.some(item => 
         ['FunctionCall', 'EvaluateScript', 'RunMicrotasks'].includes(item.event.name)
       );
       if (isInsideScript && durationMs > 1) {
         // 범인 스크립트 찾기 (스택에서 가장 최근의 FunctionCall)
         const culprit = callStack.slice().reverse().find(item => item.event.name === 'FunctionCall');
         const culpritName = culprit ? getDetailedName(culprit.event) : 'unknown script';

         results.layoutThrashing.push({
           name: event.name,
           duration: durationMs,
           timestamp: relativeStartTimeMs,
           initiator: culpritName
         });
       }
    }

    // [4] Long Task & Frame Drop 감지
    if (durationMs >= CONFIG.FRAME_BUDGET_MS) {
      // Long Task 등록 (껍데기는 제외하고 싶지만, 로깅을 위해 일단 둠)
      if (durationMs >= CONFIG.LONG_TASK_THRESHOLD_MS) {
        results.longTasks.push({
          name: detailName,
          duration: durationMs,
          timestamp: relativeStartTimeMs,
          category: event.cat
        });
      }

      // 프레임 드랍 추정
      const droppedCount = Math.floor(durationMs / CONFIG.FRAME_BUDGET_MS);
      if (droppedCount > 0) {
        results.droppedFrames.push({
          name: detailName,
          duration: durationMs,
          timestamp: relativeStartTimeMs,
          droppedCount: droppedCount,
          cause: classifyCause(event.name)
        });
      }
    }
  }

  while (callStack.length > 0) {
    const top = callStack.pop();
    processFunctionStats(results, top.event, top.childrenDuration, top.detailName);
  }

  generateDeepReport(results, traceFile, outputFile);
}

function classifyCause(eventName) {
  if (['Layout', 'Paint', 'UpdateLayoutTree', 'HitTest'].includes(eventName)) return 'Rendering';
  if (['FunctionCall', 'EvaluateScript', 'v8.compile', 'FireAnimationFrame', 'RunMicrotasks'].includes(eventName)) return 'Scripting';
  if (['GPUTask'].includes(eventName)) return 'GPU';
  return 'System/Other';
}

function processFunctionStats(results, event, childrenDuration, detailName) {
    if (!event.name || !event.dur) return;
    // 껍데기 함수는 통계 집계에서 아예 제외! (Self Time이 높아도 의미 없으므로)
    if (IGNORED_FUNCTIONS.has(event.name)) return;

    const durationMs = event.dur / 1000;
    const selfTime = Math.max(0, durationMs - childrenDuration); 
    
    // 너무 짧은 건 노이즈
    if (durationMs < 0.1) return;

    // 상세 이름(detailName)을 Key로 사용하여 정확한 함수 구분
    const key = detailName || event.name;
    const stats = results.slowFunctions.get(key) || { 
      totalTime: 0, selfTime: 0, count: 0, maxTime: 0 
    };

    stats.totalTime += durationMs;
    stats.selfTime += selfTime;
    stats.count++;
    stats.maxTime = Math.max(stats.maxTime, durationMs);
    
    results.slowFunctions.set(key, stats);
}

function generateDeepReport(results, inputFileName, outputFile) {
    const sortedDrops = [...results.droppedFrames].sort((a, b) => a.timestamp - b.timestamp);
    const dropClusters = [];
    
    // 클러스터링 로직
    if (sortedDrops.length > 0) {
        let uniqueDrops = [];
        let maxEndTime = -1;

        // 중복 제거 (포함 관계)
        for (const drop of sortedDrops) {
            const endTime = drop.timestamp + drop.duration;
            if (endTime > maxEndTime + 2) { 
                uniqueDrops.push(drop);
                maxEndTime = endTime;
            }
        }

        if (uniqueDrops.length > 0) {
            let current = {
                start: uniqueDrops[0].timestamp,
                end: uniqueDrops[0].timestamp + uniqueDrops[0].duration,
                totalDroppedFrames: uniqueDrops[0].droppedCount,
                primaryCause: uniqueDrops[0].cause,
                culprits: [uniqueDrops[0].name] // 범인 목록
            };

            for (let i = 1; i < uniqueDrops.length; i++) {
                const drop = uniqueDrops[i];
                const gap = drop.timestamp - current.end;

                if (gap < CONFIG.CLUSTER_THRESHOLD_MS) {
                    current.end = drop.timestamp + drop.duration;
                    current.totalDroppedFrames += drop.droppedCount;
                    if (current.primaryCause !== drop.cause) current.primaryCause = 'Mixed';
                    if (!current.culprits.includes(drop.name)) current.culprits.push(drop.name);
                } else {
                    dropClusters.push(current);
                    current = {
                        start: drop.timestamp,
                        end: drop.timestamp + drop.duration,
                        totalDroppedFrames: drop.droppedCount,
                        primaryCause: drop.cause,
                        culprits: [drop.name]
                    };
                }
            }
            dropClusters.push(current);
        }
    }

    results.longTasks.sort((a, b) => b.duration - a.duration);
    results.layoutThrashing.sort((a, b) => b.duration - a.duration);
    
    const sortedFunctions = [...results.slowFunctions.entries()]
        .sort((a, b) => b[1].selfTime - a[1].selfTime)
        .slice(0, 40);

    const lines = [];
    lines.push(`# 🕵️ Chrome Performance Trace 심층 분석 보고서`);
    lines.push(`분석 파일: **${path.basename(inputFileName)}**`);
    lines.push(`분석 일시: ${new Date().toLocaleString()}\n`);

    const totalWork = Object.values(results.categorySummary).reduce((a, b) => a + b, 0);
    lines.push(`## 📊 요약`);
    if (dropClusters.length > 0) {
        const totalLost = dropClusters.reduce((acc, c) => acc + c.totalDroppedFrames, 0);
        lines.push(`- **🚨 프레임 드랍**: ${dropClusters.length}개 구간, 약 **${totalLost} 프레임** 손실`);
    } else {
        lines.push(`- **✅ 프레임 상태**: 쾌적함`);
    }
    
    // ✅ [강화됨] 프레임 드랍 상세
    if (dropClusters.length > 0) {
        lines.push(`\n## 📉 프레임 드랍 집중 발생 구간`);
        lines.push(`| 시작 ~ 종료 | 지속 | 손실(추정) | 원인 | 주요 작업(상세) |`);
        lines.push(`|---|---|---|---|---|`);
        dropClusters.forEach(cluster => {
            const duration = cluster.end - cluster.start;
            const durationStr = duration > 100 ? `**${duration.toFixed(0)}ms**` : `${duration.toFixed(0)}ms`;
            
            // 범인 목록이 너무 길면 자름
            let culpritsStr = cluster.culprits.slice(0, 3).join('<br>'); 
            if (cluster.culprits.length > 3) culpritsStr += '<br>...';
            if (culpritsStr.length === 0) culpritsStr = 'Unknown';

            lines.push(`| ${cluster.start.toFixed(0)}ms ~ ${cluster.end.toFixed(0)}ms | ${durationStr} | ${cluster.totalDroppedFrames} frames | ${cluster.primaryCause} | ${culpritsStr} |`);
        });
    }

    if (results.layoutThrashing.length > 0) {
        lines.push(`\n## ⚠️ Layout Thrashing (강제 동기 레이아웃)`);
        lines.push(`| # | 이벤트 | 소요시간 | 발생 시간 | 유발 스크립트 |`);
        lines.push(`|---|---|---|---|---|`);
        results.layoutThrashing.slice(0, 10).forEach((item, i) => {
            lines.push(`| ${i+1} | ${item.name} | **${item.duration.toFixed(2)}ms** | ${item.timestamp.toFixed(0)}ms | ${item.initiator} |`);
        });
    }

    // ✅ [강화됨] 병목 함수에서 RunTask 같은 애들은 빠짐
    lines.push(`\n## 🐢 병목 함수 TOP 40 (Self Time 기준, 껍데기 제외)`);
    lines.push(`| 순위 | 함수명 (상세) | Self Time | Total Time | 호출수 | 1회 평균 |`);
    lines.push(`|---|---|---|---|---|---|`);
    sortedFunctions.forEach(([name, stats], i) => {
        const avgSelf = (stats.selfTime / stats.count).toFixed(2);
        lines.push(`| ${i+1} | \`${name}\` | **${stats.selfTime.toFixed(2)}ms** | ${stats.totalTime.toFixed(2)}ms | ${stats.count} | ${avgSelf}ms |`);
    });

    fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
    
    console.log(`\n✨ 분석 완료! 결과 파일이 생성되었습니다: ${path.basename(outputFile)}`);
    console.log('='.repeat(50));
    console.log(`[분석 결과 요약]`);
    if (dropClusters.length > 0) {
        console.log(`🚨 프레임 드랍: ${dropClusters.length}개 구간에서 약 ${dropClusters.reduce((a,c)=>a+c.totalDroppedFrames,0)} 프레임 손실`);
        console.log(`   (주요 범인: ${dropClusters[0].culprits[0]})`);
    }
    console.log(`🐢 최고 병목 함수(껍데기 제외): ${sortedFunctions[0] ? sortedFunctions[0][0] : '없음'}`);
    console.log('='.repeat(50));
}

main();