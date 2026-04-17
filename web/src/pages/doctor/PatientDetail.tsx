import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientReport, getPatientSessions, getPatientProgress, sendPatientReminder } from '../../lib/api';

interface Session {
  id: string;
  game_id: string;
  game_name?: string;
  game_name_cn?: string;
  score: number;
  duration: number;
  accuracy: number;
  training_mode: string;
  started_at: string;
}

export default function PatientDetail() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'sessions' | 'progress'>('overview');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [reminderMsg, setReminderMsg] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (!childId) return;
    loadData();
  }, [childId]);

  async function loadData() {
    if (!childId) return;
    setLoading(true);
    try {
      const [reportData, sessionsData, progressData] = await Promise.all([
        getPatientReport(childId),
        getPatientSessions(childId),
        getPatientProgress(childId),
      ]);
      setReport(reportData);
      setSessions(sessionsData);
      setProgress(progressData);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReminder() {
    if (!childId) return;
    setSendingReminder(true);
    try {
      await sendPatientReminder(childId, reminderMsg || '请坚持每日训练');
      setReminderMsg('');
      alert('提醒已发送');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingReminder(false);
    }
  }

  function calculateAge(birthDate: string): number {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  const eyeConditionLabels: Record<string, string> = {
    refractive: '屈光不正', strabismic: '斜视性',
    deprivation: '形觉剥夺', mixed: '混合性', unknown: '未知',
  };
  const phaseLabels: Record<string, string> = {
    initial: '初始期', intensive: '强化期', maintenance: '维持期',
  };
  const gameNames: Record<string, string> = {
    'stripe-chase': '条纹追踪', 'dot-pop': '光斑消消乐',
    'fusion-puzzle': '融合小拼图', 'memory-flip': '记忆翻翻卡',
    'draw-line': '眼手画线', 'accommodation-lift': '调节升降台',
    'sf-matching': 'SF连连看', 'depth-blocks': '立体积木拼',
    'visual-search-maze': '视觉搜索迷宫', 'quick-match': '快速对对碰',
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const child = report?.child || {};
  const summary = report?.summary || {};
  const gameBreakdown = report?.game_breakdown || [];
  const weeklyTrend = report?.weekly_trend || [];
  const activePlan = report?.active_plan || {};

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo">👨‍⚕️ 弱视训练 · 医生端</div>
          <nav className="nav-links">
            <button
              onClick={() => navigate('/doctor/dashboard')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ← 返回
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
        {/* Patient Info */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0' }}>{child.name || '患者'}</h2>
              <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
                <span>{child.gender === 'male' ? '男' : child.gender === 'female' ? '女' : '其他'} · {calculateAge(child.birth_date)}岁</span>
                <span>眼病: {eyeConditionLabels[child.eye_condition] || child.eye_condition}</span>
                <span>阶段: <span className={`tag phase-${child.treatment_phase}`}>{phaseLabels[child.treatment_phase] || child.treatment_phase}</span></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-outline" onClick={() => navigate(`/doctor/patients/${childId}/plan`)}>
                调整计划
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => navigate(`/fhir-export/${childId}`)}>
                FHIR导出
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{summary.total_sessions || 0}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>训练次数</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>
              {summary.total_minutes ? Math.round(summary.total_minutes) : 0}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>训练分钟</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)' }}>
              {summary.avg_score ? Math.round(summary.avg_score) : 0}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>平均得分</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--info)' }}>
              {summary.avg_accuracy ? Math.round(summary.avg_accuracy) : 0}%
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>平均准确率</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{summary.training_days || 0}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>训练天数(近30天)</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
          {(['overview', 'sessions', 'progress'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t === 'overview' ? '总览' : t === 'sessions' ? '训练记录' : '进度曲线'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Active Plan */}
            <div className="card">
              <h3 className="card-title">当前训练计划</h3>
              {activePlan.id ? (
                <div style={{ fontSize: 14 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>计划名: </span>
                    <span>{activePlan.plan_name}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>每日时长: </span>
                    <span>{activePlan.daily_duration}分钟</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>每周频率: </span>
                    <span>{activePlan.weekly_frequency}次</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>空间频率: </span>
                    <span>{activePlan.spatial_frequency_level === 'low' ? '低频' : activePlan.spatial_frequency_level === 'medium' ? '中频' : '高频'}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>训练模式: </span>
                    <span>{activePlan.training_mode === 'monocular' ? '单眼遮盖' : '双眼同视'}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>优势眼: </span>
                    <span>{activePlan.dominant_eye === 'left' ? '左眼' : activePlan.dominant_eye === 'right' ? '右眼' : '双眼'}</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>暂无激活计划</div>
              )}
            </div>

            {/* Reminder */}
            <div className="card">
              <h3 className="card-title">发送提醒</h3>
              <textarea
                value={reminderMsg}
                onChange={e => setReminderMsg(e.target.value)}
                placeholder="请坚持每日训练..."
                rows={3}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12, fontSize: 14, resize: 'vertical' }}
              />
              <button className="btn btn-primary" onClick={handleSendReminder} disabled={sendingReminder}>
                {sendingReminder ? '发送中...' : '发送提醒'}
              </button>
            </div>

            {/* Game Breakdown */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 className="card-title">游戏训练分布（近30天）</h3>
              {gameBreakdown.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>暂无数据</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {gameBreakdown.map((g: any) => (
                    <div key={g.game_id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 120, fontWeight: 500, fontSize: 14 }}>{gameNames[g.game_id] || g.game_id}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (g.sessions / Math.max(...gameBreakdown.map((x: any) => x.sessions))) * 100)}%`,
                            background: 'var(--primary)',
                            borderRadius: 4,
                          }} />
                        </div>
                      </div>
                      <div style={{ width: 200, fontSize: 13, color: 'var(--text-secondary)' }}>
                        {g.sessions}次 · 平均分{Math.round(g.avg_score)} · {Math.round(g.total_minutes || 0)}分钟
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'sessions' && (
          <div className="card">
            <h3 className="card-title">训练记录</h3>
            {sessions.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>暂无记录</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>游戏</th>
                    <th>得分</th>
                    <th>时长</th>
                    <th>准确率</th>
                    <th>模式</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 50).map(s => (
                    <tr key={s.id}>
                      <td>{new Date(s.started_at).toLocaleString('zh-CN')}</td>
                      <td>{s.game_name_cn || gameNames[s.game_id] || s.game_id}</td>
                      <td>{s.score}</td>
                      <td>{Math.round(s.duration / 60)}分钟</td>
                      <td>{Math.round(s.accuracy)}%</td>
                      <td>{s.training_mode === 'monocular' ? '单眼' : '双眼'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'progress' && (
          <div className="card">
            <h3 className="card-title">进步曲线</h3>
            {progress.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>暂无数据</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 600, height: 300, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '16px 0' }}>
                  {progress.slice(0, 30).reverse().map((p, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: '100%',
                        height: `${p.avg_score ? Math.max(5, Math.min(100, p.avg_score / 2)) : 5}%`,
                        background: 'var(--primary)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                      }} title={`${p.period}: ${Math.round(p.avg_score)}分`} />
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                        {String(p.period).slice(5)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  <span>最近30天得分趋势</span>
                  <span>平均得分: {Math.round(progress.reduce((s, p) => s + (p.avg_score || 0), 0) / progress.length)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
