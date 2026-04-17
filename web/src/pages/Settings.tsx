import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  addChild, updateChild, deleteChild,
  getTrainingPlan, updateTrainingPlan,
  getGameConfigs, updateGameConfig,
} from '../lib/api';
import { Child, TrainingPlan, GameConfig } from '../types';

export default function Settings() {
  const { user, childList, selectedChild, refreshChildren, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'children';
  const [activeTab, setActiveTab] = useState<'children' | 'plan' | 'games' | 'notifications'>(initialTab as any);

  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);

  const [childForm, setChildForm] = useState({
    name: '',
    gender: 'other',
    birth_date: '',
    eye_condition: 'unknown',
    diagnosis_date: '',
    treatment_phase: 'initial',
  });

  const [planForm, setPlanForm] = useState({
    plan_name: '默认计划',
    phase: 'initial',
    daily_duration: 20,
    weekly_frequency: 7,
    spatial_frequency_level: 'medium',
    training_mode: 'monocular',
    dominant_eye: 'both',
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['children', 'plan', 'games', 'notifications'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedChild && activeTab !== 'children') {
      loadChildData();
    }
  }, [selectedChild, activeTab]);

  async function loadChildData() {
    if (!selectedChild) return;
    try {
      const [planData, configs] = await Promise.all([
        getTrainingPlan(selectedChild.id),
        getGameConfigs(selectedChild.id),
      ]);
      setPlan(planData);
      if (planData) {
        setPlanForm({
          plan_name: planData.plan_name,
          phase: planData.phase,
          daily_duration: planData.daily_duration,
          weekly_frequency: planData.weekly_frequency,
          spatial_frequency_level: planData.spatial_frequency_level,
          training_mode: planData.training_mode,
          dominant_eye: planData.dominant_eye,
        });
      }
      setGameConfigs(configs);
    } catch (err) {
      console.error('Failed to load child data:', err);
    }
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addChild(childForm as any);
      setShowAddChild(false);
      setChildForm({
        name: '',
        gender: 'other',
        birth_date: '',
        eye_condition: 'unknown',
        diagnosis_date: '',
        treatment_phase: 'initial',
      });
      await refreshChildren();
      alert('儿童档案添加成功！');
    } catch (err: any) {
      alert('添加失败: ' + err.message);
    }
  }

  async function handleUpdateChild(e: React.FormEvent) {
    e.preventDefault();
    if (!editingChild) return;
    try {
      await updateChild(editingChild.id, childForm as any);
      setEditingChild(null);
      await refreshChildren();
      alert('儿童档案更新成功！');
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
  }

  async function handleDeleteChild(child: Child) {
    if (!confirm(`确定要删除${child.name}的训练档案吗？此操作不可恢复。`)) return;
    try {
      await deleteChild(child.id);
      await refreshChildren();
      alert('删除成功！');
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  }

  async function handleSavePlan() {
    if (!selectedChild) return;
    try {
      await updateTrainingPlan(selectedChild.id, planForm as any);
      await loadChildData();
      alert('训练计划保存成功！');
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
  }

  async function handleUpdateGameConfig(gameConfig: GameConfig) {
    if (!selectedChild) return;
    try {
      await updateGameConfig(selectedChild.id, gameConfig.game_id, gameConfig);
      alert('设置保存成功！');
    } catch (err: any) {
      alert('保存失败: ' + err.message);
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
            <button
              onClick={() => navigate('/dashboard')}
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
              ← 返回首页
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="parent-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <a
              href="?tab=children"
              className={activeTab === 'children' ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('children');
              }}
            >
              <span className="icon">👶</span>
              儿童档案
            </a>
            {selectedChild && (
              <>
                <a
                  href="?tab=plan"
                  className={activeTab === 'plan' ? 'active' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('plan');
                  }}
                >
                  <span className="icon">📋</span>
                  训练计划
                </a>
                <a
                  href="?tab=games"
                  className={activeTab === 'games' ? 'active' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('games');
                  }}
                >
                  <span className="icon">🎮</span>
                  游戏设置
                </a>
              </>
            )}
            <a
              href="?tab=notifications"
              className={activeTab === 'notifications' ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('notifications');
              }}
            >
              <span className="icon">🔔</span>
              提醒设置
            </a>
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                background: 'transparent',
                color: '#F56565',
                cursor: 'pointer',
                borderRadius: 8,
                fontWeight: 500,
                textAlign: 'left',
              }}
            >
              🚪 退出登录
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {/* Children Tab */}
          {activeTab === 'children' && (
            <>
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">儿童档案管理</h2>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAddChild(true)}
                  >
                    + 添加儿童
                  </button>
                </div>

                {childList.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">👶</div>
                    <h3>还没有添加儿童</h3>
                    <p>点击上方按钮添加孩子的训练档案</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {childList.map(child => (
                      <div
                        key={child.id}
                        style={{
                          padding: 16,
                          background: 'var(--bg-secondary)',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 24,
                            fontWeight: 700,
                          }}>
                            {child.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>{child.name}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                              {child.age ? `${child.age}岁` : ''} · {getPhaseLabel(child.treatment_phase)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingChild(child);
                              setChildForm({
                                name: child.name,
                                gender: child.gender,
                                birth_date: child.birth_date || '',
                                eye_condition: child.eye_condition,
                                diagnosis_date: child.diagnosis_date || '',
                                treatment_phase: child.treatment_phase,
                              });
                            }}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteChild(child)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Training Plan Tab */}
          {activeTab === 'plan' && selectedChild && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">训练计划设置 - {selectedChild.name}</h2>
              </div>

              <div className="settings-section">
                <h3>基本信息</h3>
                <div className="form-group">
                  <label>计划名称</label>
                  <input
                    type="text"
                    value={planForm.plan_name}
                    onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })}
                    placeholder="例如：默认训练计划"
                  />
                </div>
                <div className="form-group">
                  <label>治疗阶段</label>
                  <select
                    value={planForm.phase}
                    onChange={e => setPlanForm({ ...planForm, phase: e.target.value as any })}
                  >
                    <option value="initial">初训期</option>
                    <option value="intensive">强化期</option>
                    <option value="maintenance">维持期</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>训练安排</h3>
                <div className="form-group">
                  <label>每日训练时长（分钟）</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={planForm.daily_duration}
                    onChange={e => setPlanForm({ ...planForm, daily_duration: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>每周训练天数</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={planForm.weekly_frequency}
                    onChange={e => setPlanForm({ ...planForm, weekly_frequency: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="settings-section">
                <h3>训练模式</h3>
                <div className="form-group">
                  <label>默认训练模式</label>
                  <select
                    value={planForm.training_mode}
                    onChange={e => setPlanForm({ ...planForm, training_mode: e.target.value as any })}
                  >
                    <option value="monocular">单眼遮盖训练</option>
                    <option value="binocular">双眼同视训练</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>默认训练眼</label>
                  <select
                    value={planForm.dominant_eye}
                    onChange={e => setPlanForm({ ...planForm, dominant_eye: e.target.value as any })}
                  >
                    <option value="both">双眼</option>
                    <option value="left">左眼</option>
                    <option value="right">右眼</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>默认空间频率</label>
                  <select
                    value={planForm.spatial_frequency_level}
                    onChange={e => setPlanForm({ ...planForm, spatial_frequency_level: e.target.value as any })}
                  >
                    <option value="low">低频 (0.5 cyc/deg)</option>
                    <option value="medium">中频 (2.0 cyc/deg)</option>
                    <option value="high">高频 (4.0 cyc/deg)</option>
                  </select>
                </div>
              </div>

              <div className="disclaimer">
                ⚠️ 请在眼科医生指导下调整训练计划参数，不要自行随意更改。
              </div>

              <button className="btn btn-primary btn-full" onClick={handleSavePlan}>
                保存训练计划
              </button>
            </div>
          )}

          {/* Games Settings Tab */}
          {activeTab === 'games' && selectedChild && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">游戏参数设置 - {selectedChild.name}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {gameConfigs.map(config => (
                  <div
                    key={config.id}
                    style={{
                      padding: 16,
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <h3 style={{ fontSize: 16, marginBottom: 4 }}>{config.game_id}</h3>
                      <div className="setting-row">
                        <div className="label">启用此游戏</div>
                        <div
                          className={`toggle ${config.is_enabled ? 'active' : ''}`}
                          onClick={() => {
                            const newConfigs = gameConfigs.map(c =>
                              c.id === config.id ? { ...c, is_enabled: !c.is_enabled } : c
                            );
                            setGameConfigs(newConfigs);
                            handleUpdateGameConfig({ ...config, is_enabled: !config.is_enabled });
                          }}
                        />
                      </div>
                    </div>

                    {config.is_enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div className="form-group">
                          <label>空间频率</label>
                          <select
                            value={config.spatial_frequency}
                            onChange={e => {
                              const newConfigs = gameConfigs.map(c =>
                                c.id === config.id ? { ...c, spatial_frequency: e.target.value as any } : c
                              );
                              setGameConfigs(newConfigs);
                            }}
                            onBlur={() => handleUpdateGameConfig(config)}
                          >
                            <option value="low">低频</option>
                            <option value="medium">中频</option>
                            <option value="high">高频</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>对比度</label>
                          <select
                            value={config.contrast}
                            onChange={e => {
                              const newConfigs = gameConfigs.map(c =>
                                c.id === config.id ? { ...c, contrast: e.target.value as any } : c
                              );
                              setGameConfigs(newConfigs);
                            }}
                            onBlur={() => handleUpdateGameConfig(config)}
                          >
                            <option value="low">低对比度</option>
                            <option value="medium">中对比度</option>
                            <option value="high">高对比度</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>目标尺寸</label>
                          <select
                            value={config.target_size}
                            onChange={e => {
                              const newConfigs = gameConfigs.map(c =>
                                c.id === config.id ? { ...c, target_size: e.target.value as any } : c
                              );
                              setGameConfigs(newConfigs);
                            }}
                            onBlur={() => handleUpdateGameConfig(config)}
                          >
                            <option value="small">小</option>
                            <option value="medium">中</option>
                            <option value="large">大</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>速度</label>
                          <select
                            value={config.speed}
                            onChange={e => {
                              const newConfigs = gameConfigs.map(c =>
                                c.id === config.id ? { ...c, speed: e.target.value as any } : c
                              );
                              setGameConfigs(newConfigs);
                            }}
                            onBlur={() => handleUpdateGameConfig(config)}
                          >
                            <option value="slow">慢速</option>
                            <option value="medium">中速</option>
                            <option value="fast">快速</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">提醒设置</h2>
              </div>

              <div className="settings-section">
                <h3>训练提醒</h3>
                <div className="setting-row">
                  <div>
                    <div className="label">启用每日训练提醒</div>
                    <div className="desc">在设定时间发送训练提醒通知</div>
                  </div>
                  <div className="toggle active" />
                </div>

                <div className="form-group">
                  <label>提醒时间</label>
                  <input type="time" defaultValue="09:00" />
                  <input type="time" defaultValue="19:00" />
                </div>
              </div>

              <div className="settings-section">
                <h3>报告提醒</h3>
                <div className="setting-row">
                  <div>
                    <div className="label">周报提醒</div>
                    <div className="desc">每周一生成并发送训练周报</div>
                  </div>
                  <div className="toggle active" />
                </div>

                <div className="setting-row">
                  <div>
                    <div className="label">复诊提醒</div>
                    <div className="desc">每月提醒按时复诊</div>
                  </div>
                  <div className="toggle active" />
                </div>
              </div>

              <div className="disclaimer">
                💡 提醒功能需要订阅服务通知或绑定微信
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Child Modal */}
      {(showAddChild || editingChild) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingChild ? '编辑儿童档案' : '添加儿童档案'}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddChild(false);
                  setEditingChild(null);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={editingChild ? handleUpdateChild : handleAddChild}>
              <div className="form-group">
                <label>姓名 *</label>
                <input
                  type="text"
                  value={childForm.name}
                  onChange={e => setChildForm({ ...childForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>性别</label>
                <select
                  value={childForm.gender}
                  onChange={e => setChildForm({ ...childForm, gender: e.target.value as any })}
                >
                  <option value="other">其他</option>
                  <option value="male">男孩</option>
                  <option value="female">女孩</option>
                </select>
              </div>

              <div className="form-group">
                <label>出生日期</label>
                <input
                  type="date"
                  value={childForm.birth_date}
                  onChange={e => setChildForm({ ...childForm, birth_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>弱视类型</label>
                <select
                  value={childForm.eye_condition}
                  onChange={e => setChildForm({ ...childForm, eye_condition: e.target.value as any })}
                >
                  <option value="unknown">未知</option>
                  <option value="refractive">屈光不正性</option>
                  <option value="strabismic">斜视性</option>
                  <option value="deprivation">形觉剥夺性</option>
                  <option value="mixed">混合型</option>
                </select>
              </div>

              <div className="form-group">
                <label>诊断日期</label>
                <input
                  type="date"
                  value={childForm.diagnosis_date}
                  onChange={e => setChildForm({ ...childForm, diagnosis_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>治疗阶段</label>
                <select
                  value={childForm.treatment_phase}
                  onChange={e => setChildForm({ ...childForm, treatment_phase: e.target.value as any })}
                >
                  <option value="initial">初训期</option>
                  <option value="intensive">强化期</option>
                  <option value="maintenance">维持期</option>
                </select>
              </div>

              <div className="disclaimer" style={{ marginBottom: 16 }}>
                ⚠️ 儿童档案信息仅供训练配置使用，不代表医疗诊断。
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => {
                    setShowAddChild(false);
                    setEditingChild(null);
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingChild ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
