/**
 * 버전 정보 컴포넌트
 * 앱 버전, 업데이트 로그, 공지사항을 표시합니다.
 */
import { useState, memo } from 'react';
import { APP_VERSION, UPDATE_LOGS, getActiveNotices } from '../../config/version';
import { useUIStore } from '../../stores/uiStore';

type ModalType = 'updates' | 'notices' | null;

/**
 * 버전 정보 및 버튼들
 */
export const VersionInfo = memo(function VersionInfo() {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const language = useUIStore((state) => state.language);
  const activeNotices = getActiveNotices();

  return (
    <>
      {/* 버전 정보 영역 */}
      <div className="flex flex-col items-center gap-2 mb-4">
        {/* 버전 텍스트 (크기 증가) */}
        <span className="text-slate-400 text-sm font-medium">
          v{APP_VERSION}
        </span>

        {/* 버튼들 */}
        <div className="flex gap-2">
          <button
            onClick={() => setOpenModal('updates')}
            className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 
                       text-slate-300 rounded transition-colors"
          >
            {language === 'ko' ? '업데이트' : 'Updates'}
          </button>
          <button
            onClick={() => setOpenModal('notices')}
            className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 
                       text-slate-300 rounded transition-colors relative"
          >
            {language === 'ko' ? '공지사항' : 'Notices'}
            {activeNotices.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* 모달 */}
      {openModal && (
        <InfoModal
          type={openModal}
          language={language}
          activeNotices={activeNotices}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  );
});

/** 정보 모달 */
function InfoModal({
  type,
  language,
  activeNotices,
  onClose,
}: {
  type: 'updates' | 'notices';
  language: string;
  activeNotices: ReturnType<typeof getActiveNotices>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <article className="bg-slate-800 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {type === 'updates'
              ? language === 'ko' ? '업데이트' : 'Update History'
              : language === 'ko' ? '공지사항' : 'Notices'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </header>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {type === 'updates' ? (
            <UpdatesContent />
          ) : (
            <NoticesContent language={language} notices={activeNotices} />
          )}
        </div>
      </article>
    </div>
  );
}

/** 업데이트 내용 */
function UpdatesContent() {
  return (
    <div className="space-y-4">
      {UPDATE_LOGS.map((log) => (
        <section key={log.version} className="bg-slate-900/50 rounded-lg p-3">
          <header className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-white">{log.title}</h3>
            <span className="text-xs text-slate-500">v{log.version}</span>
          </header>
          <time className="text-xs text-slate-500 block mb-2">{log.date}</time>
          <ul className="space-y-1">
            {log.changes.map((change, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                {change}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** 공지사항 내용 */
function NoticesContent({ 
  language, 
  notices 
}: { 
  language: string; 
  notices: ReturnType<typeof getActiveNotices>;
}) {
  if (notices.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8">
        {language === 'ko' ? '현재 공지사항이 없습니다.' : 'No notices at this time.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {notices.map((notice) => (
        <article
          key={notice.id}
          className={`rounded-lg p-3 ${
            notice.type === 'event'
              ? 'bg-cyan-900/30 border border-cyan-700'
              : notice.type === 'warning'
              ? 'bg-yellow-900/30 border border-yellow-700'
              : 'bg-slate-900/50'
          }`}
        >
          <h3 className="font-bold text-white mb-1">{notice.title}</h3>
          <p className="text-sm text-slate-300">{notice.content}</p>
        </article>
      ))}
    </div>
  );
}
