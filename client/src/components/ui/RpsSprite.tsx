/**
 * RPS 스프라이트 컴포넌트
 * 가위/바위/보 이미지를 스프라이트시트에서 표시합니다.
 * 이모지 대신 이미지를 사용하여 성능 향상 및 일관된 비주얼 제공
 */
import { memo } from 'react';
import type { RPSState } from '@chaos-rps/shared';

/** RPS 상태별 스프라이트 오프셋 (128px 프레임) */
const RPS_SPRITE_OFFSET: Record<RPSState, number> = {
    rock: 0,       // 0px
    paper: 128,    // 128px
    scissors: 256, // 256px
};

/** RPS 상태별 색상 (배경/테두리용) */
export const RPS_COLORS: Record<RPSState, string> = {
    rock: '#4ecdc4',
    paper: '#ffe66d',
    scissors: '#ff6b6b',
};

/** RPS 상태별 한글 이름 */
export const RPS_NAMES: Record<RPSState, string> = {
    rock: '바위',
    paper: '보',
    scissors: '가위',
};

export interface RpsSpriteProps {
    /** RPS 상태 */
    state: RPSState;
    /** 표시 크기 (px 또는 vw 등) */
    size?: string | number;
    /** 추가 클래스 */
    className?: string;
}

/**
 * RPS 스프라이트 컴포넌트
 * CSS background-position을 사용하여 스프라이트시트에서 해당 프레임 표시
 */
export const RpsSprite = memo(function RpsSprite({
    state,
    size = 32,
    className = ''
}: RpsSpriteProps) {
    const numericSize = typeof size === 'number' ? size : 32;
    const sizeValue = typeof size === 'number' ? `${size}px` : size;

    // 스프라이트시트: 384x128 (128px * 3 프레임)
    // 크기 조절: 표시 크기에 맞게 스케일
    const scaledWidth = numericSize * 3;  // 전체 스프라이트시트 너비
    const scaledHeight = numericSize;      // 프레임 높이
    const offsetX = numericSize * (RPS_SPRITE_OFFSET[state] / 128);

    return (
        <div
            className={className}
            style={{
                width: sizeValue,
                height: sizeValue,
                backgroundImage: 'url(/assets/images/rps.png)',
                backgroundSize: `${scaledWidth}px ${scaledHeight}px`,
                backgroundPosition: `-${offsetX}px 0`,
                display: 'inline-block',
            }}
            aria-label={RPS_NAMES[state]}
        />
    );
});

