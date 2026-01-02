/**
 * 피드백 라우트 - PostgreSQL 버전
 * Railway PostgreSQL에 피드백 저장
 */

import { FastifyPluginAsync } from 'fastify';
import { getPool } from '../services/database';

interface FeedbackBody {
    type: 'bug' | 'feature' | 'balance' | 'other';
    content: string;
    email?: string;
    userAgent?: string;
    platform?: string;
}

const feedbackRoute: FastifyPluginAsync = async (fastify) => {
    /**
     * 피드백 제출
     */
    fastify.post('/feedback', async (request, reply) => {
        const { type, content, email, userAgent, platform } = request.body as FeedbackBody;

        // 유효성 검사
        if (!type || !content) {
            return reply.code(400).send({ error: 'Type and content are required' });
        }

        if (content.length > 5000) {
            return reply.code(400).send({ error: 'Content too long (max 5000 characters)' });
        }

        // 피드백 ID 생성
        const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            const pool = getPool();

            // DB에 저장
            await pool.query(
                `INSERT INTO feedbacks (id, type, content, email, user_agent, platform, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    feedbackId,
                    type,
                    content,
                    email || 'anonymous',
                    userAgent || request.headers['user-agent'] || 'unknown',
                    platform || 'unknown',
                    request.ip,
                ]
            );

            // 콘솔에도 출력
            console.log('📬 [Feedback Received]', {
                id: feedbackId,
                type,
                email: email || 'anonymous',
                content: content.substring(0, 100) + '...',
            });

            return reply.code(201).send({
                success: true,
                message: 'Feedback received',
                id: feedbackId,
            });
        } catch (error) {
            console.error('[Feedback] Error saving feedback:', error);
            return reply.code(500).send({ error: 'Failed to save feedback' });
        }
    });

    /**
     * 피드백 통계 (관리자용)
     */
    fastify.get('/feedback/stats', async (_, reply) => {
        try {
            const pool = getPool();

            // 전체 개수
            const totalResult = await pool.query('SELECT COUNT(*) as count FROM feedbacks');
            const total = parseInt(totalResult.rows[0].count);

            // 타입별 개수
            const typeResult = await pool.query(`
        SELECT type, COUNT(*) as count
        FROM feedbacks
        GROUP BY type
      `);

            const byType = {
                bug: 0,
                feature: 0,
                balance: 0,
                other: 0,
            };

            typeResult.rows.forEach((row: any) => {
                byType[row.type as keyof typeof byType] = parseInt(row.count);
            });

            // 최근 5개
            const recentResult = await pool.query(`
        SELECT id, type, content, email, created_at
        FROM feedbacks
        ORDER BY created_at DESC
        LIMIT 5
      `);

            const stats = {
                total,
                byType,
                recent: recentResult.rows,
            };

            return reply.send(stats);
        } catch (error) {
            console.error('[Feedback] Error getting stats:', error);
            return reply.code(500).send({ error: 'Failed to get stats' });
        }
    });

    /**
     * 피드백 대시보드 (HTML)
     */
    fastify.get('/feedback/dashboard', async (_, reply) => {
        try {
            const pool = getPool();
            const result = await pool.query('SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 100');

            const rows = result.rows.map((row: any) => `
        <tr class="${row.type}">
          <td>${new Date(row.created_at).toLocaleString()}</td>
          <td><span class="badge ${row.type}">${row.type}</span></td>
          <td>${row.content}</td>
          <td>${row.email || '-'}</td>
          <td class="meta">${row.platform} / ${row.user_agent}</td>
        </tr>
      `).join('');

            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ChaosRPS Feedback Dashboard</title>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #f0f2f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { margin-bottom: 20px; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f8f9fa; font-weight: 600; color: #555; }
            tr:hover { background: #f8f9fa; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .badge.bug { background: #fee2e2; color: #991b1b; }
            .badge.feature { background: #dbeafe; color: #1e40af; }
            .badge.balance { background: #fef3c7; color: #92400e; }
            .badge.other { background: #f3f4f6; color: #374151; }
            .meta { font-size: 12px; color: #666; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📬 User Feedback (${result.rows.length})</h1>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Content</th>
                  <th>Email</th>
                  <th>Meta</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;

            return reply.type('text/html').send(html);
        } catch (error) {
            return reply.code(500).send('Failed to load dashboard');
        }
    });

    /**
     * 모든 피드백 조회 (관리자용)
     */
    fastify.get('/feedback/all', async (_, reply) => {
        try {
            const pool = getPool();

            const result = await pool.query(`
        SELECT id, type, content, email, user_agent, platform, ip, created_at
        FROM feedbacks
        ORDER BY created_at DESC
      `);

            return reply.send({
                total: result.rows.length,
                feedbacks: result.rows,
            });
        } catch (error) {
            console.error('[Feedback] Error getting all feedback:', error);
            return reply.code(500).send({ error: 'Failed to get feedback' });
        }
    });
};

export default feedbackRoute;
