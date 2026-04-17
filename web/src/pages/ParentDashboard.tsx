import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getDailySummary, getWeeklyReport, getTrainingHistory } from '../lib/api';
import { TrainingSession, ProgressData } from '../types';

export default function ParentDashboard() {
  const { user, childList, selectedChild, selectChild, logout } = useAuth();
  const navigate = useNavigate();
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<TrainingSession[]>([]);

  useEffect(() => {
    if (selectedChild) {
      loadData();
    }
  }, [selectedChild]);

  async function loadData() {
    if (!selectedChild) return;
    try {
      const [summary, weekly, history] = await Promise.all([
        getDailySummary(selectedChild.id),
        getWeeklyReport(selectedChild.id),
        getTrainingHistory(selectedChild.id, 10, 0),
      ]);
      setDailySummary(summary);
      setWeeklyReport(weekly);
      setRecentSessions(history);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
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
            <Link to="/dashboard" className="active">首页</Link>
            <Link to="/games">训练</Link>
            <Link to="/reports">报告</Link>
            <Link to="/settings">设置</Link>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 500,
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
              }}
            >
              退出
            </button>
          </nav>
        </div>
      </header>

      {/* Child Selector */}
      {childList.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
          <div className="container">
            <div className="child-selector">
              {childList.map(child => (
                <div
                  key={child.id}
                  className={`child-card ${selectedChild?.id === child.id ? 'selected' : ''}`}
                  onClick={() => selectChild(child)}
                >
                  <div className="child-avatar">
                    {child.name.charAt(0)}
                  </div>
                  <div className="child-info">
                    <div className="name">{child.name}</div>
                    <div className="meta">
                      {child.age ? `${child.age}岁` : ''} · {getPhaseLabel(child.treatment_phase)}
                    </div>
                  </div>
                </div>
              ))}
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/settings?tab=children')}
                style={{ padding: '12px 20px' }}
              >
                + 添加儿童
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="parent-layout">
        <main className="main-content">
          {childList.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="icon">👶</div>
                <h3>还没有添加儿童档案</h3>
                <p>点击上方按钮添加孩子的训练档案，开始训练</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/settings?tab=children')}
                  style={{ marginTop: 16 }}
                >
                  添加儿童
                </button>
              </div>
            </div>
          ) : selectedChild ? (
            <>
              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card highlight">
                  <div className="label">今日训练时长</div>
                  <div className="value">
                    {dailySummary ? Math.round(dailySummary.total_minutes || 0) : 0}
                    <span className="unit"> 分钟</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">本周训练天数</div>
                  <div className="value">
                    {weeklyReport?.summary?.training_days || 0}
                    <span className="unit"> 天</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">本周平均得分</div>
                  <div className="value">
                    {weeklyReport?.summary ? Math.round(weeklyReport.summary.avg_score || 0) : '--'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">总训练次数</div>
                  <div className="value">
                    {dailySummary?.sessions || 0}
                    <span className="unit"> 次</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">开始训练</h2>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link to="/games" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: 18 }}>
                    🎮 进入训练
                  </Link>
                  <Link to="/reports" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: 18 }}>
                    📊 查看报告
                  </Link>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">最近训练记录</h2>
                  <Link to="/reports" style={{ fontSize: 14, color: 'var(--primary)' }}>
                    查看全部 →
                  </Link>
                </div>
                {recentSessions.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                    暂无训练记录
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>游戏</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>日期</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>得分</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>时长</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSessions.slice(0, 5).map(session => (
                          <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 500 }}>{session.game_name_cn || session.game_id}</div>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: 14 }}>
                              {new Date(session.started_at).toLocaleDateString('zh-CN')}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--primary)' }}>
                              {session.score}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              {Math.round(session.duration / 60)}分钟
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="icon">👶</div>
                <h3>请选择或添加儿童档案</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/settings?tab=children')}
                  style={{ marginTop: 16 }}
                >
                  添加儿童
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    initial: '初训期',
    intensive: '强化期',
    maintenance: '维持期',
  };
  return labels[phase] || phase;
}
