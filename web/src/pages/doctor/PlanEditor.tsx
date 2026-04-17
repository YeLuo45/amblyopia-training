import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientReport, updatePatientPlan } from '../../lib/api';
import { GAMES } from '../../types';

export default function PlanEditor() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [child, setChild] = useState<any>(null);
  const [form, setForm] = useState({
    plan_name: '医生处方',
    phase: 'initial' as 'initial' | 'intensive' | 'maintenance',
    daily_duration: 20,
    weekly_frequency: 7,
    spatial_frequency_level: 'medium' as 'low' | 'medium' | 'high',
    training_mode: 'monocular' as 'monocular' | 'binocular',
    dominant_eye: 'both' as 'left' | 'right' | 'both',
    allowed_games: [] as string[],
  });

  useEffect(() => {
    if (!childId) return;
    loadData();
  }, [childId]);

  async function loadData() {
    if (!childId) return;
    try {
      const report = await getPatientReport(childId);
      setChild(report.child);
      const plan = report.active_plan;
      if (plan) {
        setForm({
          plan_name: plan.plan_name || '医生处方',
          phase: plan.phase || 'initial',
          daily_duration: plan.daily_duration || 20,
          weekly_frequency: plan.weekly_frequency || 7,
          spatial_frequency_level: plan.spatial_frequency_level || 'medium',
          training_mode: plan.training_mode || 'monocular',
          dominant_eye: plan.dominant_eye || 'both',
          allowed_games: plan.allowed_games ? JSON.parse(plan.allowed_games) : [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!childId) return;
    setSaving(true);
    try {
      await updatePatientPlan(childId, form);
      alert('计划已更新');
      navigate(`/doctor/patients/${childId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleGame(gameId: string) {
    setForm(prev => ({
      ...prev,
      allowed_games: prev.allowed_games.includes(gameId)
        ? prev.allowed_games.filter(g => g !== gameId)
        : [...prev.allowed_games, gameId],
    }));
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const gameIcons: Record<string, string> = {
    'stripe-chase': '🏃', 'dot-pop': '🎯', 'fusion-puzzle': '🧩',
    'memory-flip': '🃏', 'draw-line': '✏️', 'accommodation-lift': '🎈',
    'sf-matching': '🔲', 'depth-blocks': '🧱', 'visual-search-maze': '🔍',
    'quick-match': '⚡',
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo">👨‍⚕️ 弱视训练 · 医生端</div>
          <nav className="nav-links">
            <button
              onClick={() => navigate(`/doctor/patients/${childId}`)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ← 返回
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>
        <div className="card">
          <h2 className="card-title">训练计划调整</h2>
          {child && (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              患者: {child.name} · {child.gender === 'male' ? '男' : child.gender === 'female' ? '女' : '其他'}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>计划名称</label>
              <input
                type="text"
                value={form.plan_name}
                onChange={e => setForm({ ...form, plan_name: e.target.value })}
                placeholder="医生处方"
              />
            </div>

            <div className="form-group">
              <label>治疗阶段</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['initial', 'intensive', 'maintenance'] as const).map(phase => (
                  <button
                    key={phase}
                    type="button"
                    className={form.phase === phase ? 'btn btn-primary' : 'btn btn-outline'}
                    onClick={() => setForm({ ...form, phase })}
                  >
                    {phase === 'initial' ? '初始期' : phase === 'intensive' ? '强化期' : '维持期'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>每日时长（分钟）</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={form.daily_duration}
                  onChange={e => setForm({ ...form, daily_duration: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label>每周频率（次）</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={form.weekly_frequency}
                  onChange={e => setForm({ ...form, weekly_frequency: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>空间频率</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['low', 'medium', 'high'] as const).map(sf => (
                  <button
                    key={sf}
                    type="button"
                    className={form.spatial_frequency_level === sf ? 'btn btn-primary' : 'btn btn-outline'}
                    onClick={() => setForm({ ...form, spatial_frequency_level: sf })}
                  >
                    {sf === 'low' ? '低频 0.5 cyc/deg' : sf === 'medium' ? '中频 2.0 cyc/deg' : '高频 4.0 cyc/deg'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>训练模式</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={form.training_mode === 'monocular' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setForm({ ...form, training_mode: 'monocular' })}
                >
                  👁️ 单眼遮盖
                </button>
                <button
                  type="button"
                  className={form.training_mode === 'binocular' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setForm({ ...form, training_mode: 'binocular' })}
                >
                  👀 双眼同视
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>优势眼</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['left', 'right', 'both'] as const).map(eye => (
                  <button
                    key={eye}
                    type="button"
                    className={form.dominant_eye === eye ? 'btn btn-primary' : 'btn btn-outline'}
                    onClick={() => setForm({ ...form, dominant_eye: eye })}
                  >
                    {eye === 'left' ? '左眼' : eye === 'right' ? '右眼' : '双眼'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>允许的游戏（不选则允许全部）</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {GAMES.map(game => (
                  <div
                    key={game.id}
                    onClick={() => toggleGame(game.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: form.allowed_games.includes(game.id) || form.allowed_games.length === 0
                        ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: form.allowed_games.includes(game.id) ? 'rgba(74,144,226,0.1)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {gameIcons[game.id]} {game.name_cn}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '保存中...' : '保存计划'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate(`/doctor/patients/${childId}`)}>
                取消
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
