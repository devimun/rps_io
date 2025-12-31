/**
 * 튜토리얼 오버레이 컴포넌트
 * 게임 방법을 설명하는 오버레이입니다.
 */
import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { t } from '../../utils/i18n';

/**
 * 튜토리얼 컴포넌트
 */
export function Tutorial() {
  const { language, isMobile, dismissTutorial, setShowTutorial } = useUIStore();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  /** 시작하기 */
  const handleStart = () => {
    if (dontShowAgain) {
      dismissTutorial();
    } else {
      setShowTutorial(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <article className="bg-slate-800 rounded-2xl p-8 max-w-md w-full">
        {/* 제목 */}
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          {t('tutorial.title', language)}
        </h1>

        {/* 규칙 목록 */}
        <ul className="space-y-4 mb-6">
          <TutorialRule
            icon="✂️"
            text={t('tutorial.rule1', language)}
            description="가위는 보를, 보는 바위를, 바위는 가위를 이깁니다"
          />
          <TutorialRule
            icon="📈"
            text={t('tutorial.rule3', language)}
            description="킬이 많을수록 캐릭터가 커집니다"
          />
          <TutorialRule
            icon="🔄"
            text={t('tutorial.rule4', language)}
            description="모든 플레이어가 동시에 변신합니다"
          />
        </ul>

        {/* 모바일 전용: PC 권장 메시지 */}
        {isMobile && (
          <div className="bg-slate-700/50 rounded-lg p-3 mb-6 border border-cyan-500/30">
            <p className="text-cyan-400 text-sm font-medium flex items-center gap-2">
              <span>💻</span>
              {language === 'ko' 
                ? 'PC에서 플레이하면 미니맵, 킬로그 등 더 많은 기능을 즐길 수 있습니다!'
                : 'Play on PC for minimap, kill feed, and better performance!'}
            </p>
          </div>
        )}

        {/* 다시 보지 않기 */}
        <label className="flex items-center gap-3 text-slate-400 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-5 h-5 rounded border-slate-600"
          />
          {t('tutorial.dontShowAgain', language)}
        </label>

        {/* 시작 버튼 */}
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 
                     text-white font-bold text-lg transition-colors"
        >
          {t('tutorial.start', language)}
        </button>
      </article>
    </div>
  );
}

/** 튜토리얼 규칙 아이템 */
interface TutorialRuleProps {
  icon: string;
  text: string;
  description: string;
}

function TutorialRule({ icon, text, description }: TutorialRuleProps) {
  return (
    <li className="flex items-start gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-white font-medium">{text}</p>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
    </li>
  );
}
