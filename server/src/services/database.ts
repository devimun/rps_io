/**
 * PostgreSQL 데이터베이스 연결
 * Railway PostgreSQL 사용
 */

import { Pool } from 'pg';

// Railway에서 자동으로 제공하는 DATABASE_URL 사용
const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;

/**
 * DB 연결 풀 가져오기 (싱글톤)
 */
export function getPool(): Pool {
    if (!pool) {
        if (!DATABASE_URL) {
            console.warn('[Database] DATABASE_URL not set - Database features disabled');
            // 개발 환경에서는 더미 풀 반환
            pool = new Pool({
                max: 0,
            });
        } else {
            pool = new Pool({
                connectionString: DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false, // Railway SSL 설정
                },
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            console.log('[Database] PostgreSQL connection pool created');
        }
    }

    return pool;
}

/**
 * 피드백 테이블 초기화
 */
export async function initDatabase(): Promise<void> {
    if (!DATABASE_URL) {
        console.log('[Database] Skipping initialization (no DATABASE_URL)');
        return;
    }

    const pool = getPool();

    try {
        // feedbacks 테이블 생성 (없으면)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        email VARCHAR(255),
        user_agent TEXT,
        platform VARCHAR(50),
        ip VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('[Database] Feedbacks table initialized');
    } catch (error) {
        console.error('[Database] Failed to initialize:', error);
    }
}

/**
 * 연결 종료
 */
export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('[Database] Connection pool closed');
    }
}
