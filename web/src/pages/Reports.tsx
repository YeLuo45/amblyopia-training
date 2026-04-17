import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getTrainingHistory, getProgress, generateConsultationReport } from '../lib/api';

export default function Reports() {
  const { selectedChild } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'history'>('daily');
  const [progressData, setProgressData] = useState<any>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [shareToken, setShareToken] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedChild) {
      loadData();
    }
  }, [selectedChild, activeTab]);

  async function loadData() {
    if (!selectedChild) return;
    setLoading(true);
    try {
      if (activeTab === 'history') {
        const historyData = await getTrainingHistory(selectedChild.id, 50, 0);
        setHistory(historyData);
      } else {
        const period = activeTab === 'daily' ? 'week' : 'month';
        const progress = await getProgress(selectedChild.id, period);
        setProgressData(progress);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!selectedChild) return;
    try {
      const result = await generateConsultationReport(selectedChild.id);
      setShareToken(result.share_token);
      alert('报告已生成！分享链接已复制到剪贴板，可以发给医生查看。');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(`${window.location.origin}/training/report/shared/${result.share_token}`);
      }
    } catch (err: any) {
      alert('生成报告失败: ' + err.message);
    }
  }

  function renderProgressChart() {
    if (progressData.length === 0) {
      return (
        <div className="empty-state">
          <div className="icon">📊</div>
          <h3>暂无训练数据</h3>
          <p>开始训练后这里会显示进步曲线</p>
        </div>
      );
    }

    const maxScore = Math.max(...progressData.map((d: any) => d.max_score), 100);
    const chartHeight = 200;
    const barWidth = 40;
    const gap = 20;

    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap, padding: '20px 0', overflowX: 'auto' }}>
        {progressData.map((d: any, idx: number) => {
          const height = (d.avg_score / maxScore) * chartHeight;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: barWidth,
                height: Math.max(height, 4),
                background: `linear-gradient(to top, #4A90E2, #63B3ED)`,
                borderRadius: 8,
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute',
                  top: -25,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {Math.round(d.avg_score)}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {d.period.slice(-5)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="#4A90E2"/>
              <ellipse cx="50" cy="50" rx="35" ry="20" fill="white"/>
              <circle cx="50" cy="50" r="12" fill="#2C5282"/>
              <circle cx="54" cy="46" r="4" fill="white"/>
            </svg>
            弱视训练
          </div>
          <nav className="nav-links">
            <Link to="/dashboard">首页</Link>
            <Link to="/games">训练</Link>
            <Link to="/reports" className="active">报告</Link>
            <Link to="/settings">设置</Link>
          </nav>
        </div>
      </header>

      {/* Child Selector */}
      {selectedChild && (
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>当前儿童:</span>
              <span style={{ fontWeight: 600 }}>{selectedChild.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content" style={{ maxWidth: 1000, margin: '0 auto' }}>
        {!selectedChild ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">👶</div>
              <h3>请先选择儿童</h3>
              <Link to="/select-child" className="btn btn-primary">
                选择儿童
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              {[
                { key: 'daily', label: '周视图' },
                { key: 'monthly', label: '月视图' },
                { key: 'history', label: '历史记录' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                    color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Progress Tab */}
            {activeTab !== 'history' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    {activeTab === 'daily' ? '周进步曲线' : '月进步曲线'}
                  </h2>
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateReport}
                    style={{ padding: '10px 20px', fontSize: 14 }}
                  >
                    📄 生成复诊报告
                  </button>
                </div>

                {loading ? (
                  <div className="loading"><div className="spinner" /></div>
                ) : (
                  <>
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                      {progressData.slice(0, 3).map((d: any, idx: number) => (
                        <div key={idx} className="stat-card">
                          <div className="label">{d.period}</div>
                          <div className="value">{Math.round(d.avg_score || 0)}</div>
                          <div className="unit">平均得分</div>
                        </div>
                      ))}
                    </div>

                    <h3 style={{ marginBottom: 16, fontSize: 16 }}>得分趋势</h3>
                    <div className="chart-container">
                      {renderProgressChart()}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">训练历史</h2>
                </div>

                {loading ? (
                  <div className="loading"><div className="spinner" /></div>
                ) : history.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📋</div>
                    <h3>暂无训练记录</h3>
                    <p>开始训练后这里会显示所有训练记录</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>日期</th>
                          <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>游戏</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>模式</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>得分</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>准确率</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>时长</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(session => (
                          <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px', fontSize: 14 }}>
                              {new Date(session.started_at).toLocaleString('zh-CN')}
                            </td>
                            <td style={{ padding: '12px', fontSize: 14 }}>
                              <div style={{ fontWeight: 500 }}>{session.game_name_cn || session.game_id}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {session.spatial_frequency === 'low' ? '低频' : session.spatial_frequency === 'medium' ? '中频' : '高频'}
                              </div>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontSize: 13 }}>
                              {session.training_mode === 'monocular' ? '单眼' : '双眼'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--primary)' }}>
                              {session.score}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontSize: 14 }}>
                              {Math.round(session.accuracy)}%
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                              {Math.round(session.duration / 60)}分钟
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Share Token Display */}
            {shareToken && (
              <div className="card" style={{ background: 'rgba(72, 187, 120, 0.1)', borderColor: '#48BB78' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>🔗</div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2F855A', marginBottom: 4 }}>报告分享链接</div>
                    <div style={{ fontSize: 13, color: '#276749', wordBreak: 'break-all' }}>
                      {window.location.origin}/training/report/shared/{shareToken}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
