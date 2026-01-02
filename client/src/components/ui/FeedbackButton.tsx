/**
 * 인게임 피드백 모달
 * 사용자 피드백을 서버로 직접 전송
 */

import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { trackFeedback } from '../../services/analytics';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type FeedbackType = 'bug' | 'feature' | 'balance' | 'other';

export function FeedbackModal() {
    const { language } = useUIStore();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<FeedbackType>('bug');
    const [content, setContent] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) return;

        setIsSubmitting(true);
        trackFeedback('submit');

        try {
            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type,
                    content: content.trim(),
                    email: email.trim() || undefined,
                    userAgent: navigator.userAgent,
                    platform: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            setSubmitted(true);

            // 2초 후 모달 닫기
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
                setContent('');
                setEmail('');
                setType('bug');
            }, 2000);
        } catch (error) {
            console.error('[Feedback] Failed to submit:', error);
            alert(language === 'ko' ? '전송 실패. 다시 시도해주세요.' : 'Failed to submit. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        trackFeedback('open');
    };

    return (
        <>
            {/* 플로팅 버튼 */}
            <button
                onClick={handleOpen}
                className="fixed bottom-4 right-4 z-40 bg-blue-500 hover:bg-blue-600 
                   text-white p-3 rounded-full shadow-lg transition-all duration-200
                   hover:scale-110"
                aria-label="Feedback"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                </svg>
            </button>

            {/* 모달 */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">
                                💬 {language === 'ko' ? '피드백 보내기' : 'Send Feedback'}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {submitted ? (
                            // 성공 메시지
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">✅</div>
                                <p className="text-white text-lg font-semibold mb-2">
                                    {language === 'ko' ? '전송 완료!' : 'Sent Successfully!'}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    {language === 'ko' ? '소중한 의견 감사합니다' : 'Thank you for your feedback'}
                                </p>
                            </div>
                        ) : (
                            // 피드백 폼
                            <form onSubmit={handleSubmit}>
                                {/* 타입 선택 */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {language === 'ko' ? '유형' : 'Type'}
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as FeedbackType)}
                                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 
                               border border-slate-600 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="bug">{language === 'ko' ? '🐛 버그 신고' : '🐛 Bug Report'}</option>
                                        <option value="feature">{language === 'ko' ? '💡 기능 제안' : '💡 Feature Request'}</option>
                                        <option value="balance">{language === 'ko' ? '⚖️ 밸런스 문제' : '⚖️ Balance Issue'}</option>
                                        <option value="other">{language === 'ko' ? '💬 기타' : '💬 Other'}</option>
                                    </select>
                                </div>

                                {/* 내용 */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {language === 'ko' ? '내용' : 'Content'}
                                        <span className="text-red-400 ml-1">*</span>
                                    </label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder={language === 'ko' ? '구체적으로 적어주세요...' : 'Please describe in detail...'}
                                        rows={4}
                                        maxLength={5000}
                                        required
                                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 
                               border border-slate-600 focus:border-blue-500 focus:outline-none
                               resize-none"
                                    />
                                    <div className="text-right text-xs text-gray-400 mt-1">
                                        {content.length} / 5000
                                    </div>
                                </div>

                                {/* 이메일 (선택) */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {language === 'ko' ? '이메일 (선택사항)' : 'Email (Optional)'}
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={language === 'ko' ? 'reply@example.com' : 'reply@example.com'}
                                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 
                               border border-slate-600 focus:border-blue-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        {language === 'ko' ? '답변받고 싶으신 경우 작성해주세요' : 'For receiving a response'}
                                    </p>
                                </div>

                                {/* 버튼 */}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 
                               rounded-lg transition-colors"
                                    >
                                        {language === 'ko' ? '취소' : 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !content.trim()}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 
                               disabled:cursor-not-allowed text-white py-2 px-4 
                               rounded-lg transition-colors font-semibold"
                                    >
                                        {isSubmitting
                                            ? (language === 'ko' ? '전송 중...' : 'Sending...')
                                            : (language === 'ko' ? '전송' : 'Send')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
