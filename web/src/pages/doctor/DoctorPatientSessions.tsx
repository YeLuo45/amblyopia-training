import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientSessions } from '../../lib/api';
import { GAMES } from '../../types';

interface Session {
  id: string;
  game_id: string;
  game_name?: string;
  game_name_cn?: string;
  score: number;
  duration: number;
  accuracy: number;
  combo_max: number;
  level_completed: number;
  training_mode: string;
  spatial_frequency: string;
  started_at: string;
  ended_at?: string;
}

export default function DoctorPatientSessions() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadSessions();
  }, [childId]);

  async function loadSessions(offset = 0) {
    if (!childId) return;
    try {
      const data = await getPatientSessions(childId, pageSize, offset);
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  function getGameName(gameId: string): string {
    const game = GAMES.find(g => g.id === gameId);
    return game?.name_cn || gameId;
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A365D' }}>训练记录</h1>
          </div>
          <button
            onClick={() => navigate(`/doctor/patients/${childId}`)}
            style={{
              padding: '10px 20px',
              background: '#E2E8F0',
              color: '#4A5568',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            返回患者详情
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        {sessions.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#4A5568', marginBottom: '8px' }}>
              暂无训练记录
            </h3>
            <p style={{ color: '#718096' }}>
              该患者尚未进行任何训练
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F7FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>时间</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>游戏</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>得分</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>时长</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>准确率</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>连击</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>关卡</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>模式</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#718096' }}>
                        {formatDate(session.started_at)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 500, color: '#2D3748' }}>{getGameName(session.game_id)}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#2D3748' }}>
                        {session.score}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#718096' }}>
                        {formatDuration(session.duration)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: session.accuracy >= 80 ? '#C6F6D5' : session.accuracy >= 60 ? '#FEEBC8' : '#FED7D7',
                          color: session.accuracy >= 80 ? '#276749' : session.accuracy >= 60 ? '#C05621' : '#C53030',
                        }}>
                          {session.accuracy}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#718096' }}>
                        {session.combo_max}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#718096' }}>
                        L{session.level_completed}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#718096' }}>
                        {session.training_mode === 'monocular' ? '单眼' : '双眼'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sessions.length === pageSize && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => { setPage(p => p - 1); loadSessions((page - 1) * pageSize); }}
                  disabled={page === 0}
                  style={{
                    padding: '10px 20px',
                    background: page === 0 ? '#E2E8F0' : '#EBF8FF',
                    color: page === 0 ? '#A0AEC0' : '#2B6CB0',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  上一页
                </button>
                <button
                  onClick={() => { setPage(p => p + 1); loadSessions((page + 1) * pageSize); }}
                  style={{
                    padding: '10px 20px',
                    background: '#EBF8FF',
                    color: '#2B6CB0',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
