import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { createPrescription, getPatientPrescriptions } from '../../lib/api';
import { GAMES } from '../../types';

export default function DoctorNewPrescription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');

  const [formData, setFormData] = useState({
    plan_name: '',
    daily_duration: 20,
    spatial_frequency_level: 'medium',
    training_mode: 'monocular',
    dominant_eye: 'both',
    allowed_games: [] as string[],
    instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  const [loading, setLoading] = useState(false);
  const [existingPrescriptions, setExistingPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    if (childId) {
      getPatientPrescriptions(childId).then(setExistingPrescriptions).catch(console.error);
    }
  }, [childId]);

  const availableGames = GAMES.filter(g => g.modes.includes(formData.training_mode as any));

  function toggleGame(gameId: string) {
    setFormData(prev => ({
      ...prev,
      allowed_games: prev.allowed_games.includes(gameId)
        ? prev.allowed_games.filter(id => id !== gameId)
        : [...prev.allowed_games, gameId],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!childId) return;
    if (formData.allowed_games.length === 0) {
      alert('请至少选择一个游戏');
      return;
    }

    setLoading(true);
    createPrescription({
      child_id: childId,
      ...formData,
    })
      .then(() => {
        navigate(`/doctor/patients/${childId}`);
      })
      .catch((err) => {
        alert(err.message || '创建失败');
        setLoading(false);
      });
  }

  if (!childId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>缺少患者ID</p>
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
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A365D' }}>新建处方</h1>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2D3748', marginBottom: '20px' }}>基本信息</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>处方名称</label>
              <input
                type="text"
                value={formData.plan_name}
                onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                placeholder="如：强化训练计划"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>每日训练时长</label>
                <select
                  value={formData.daily_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_duration: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value={10}>10分钟</option>
                  <option value={15}>15分钟</option>
                  <option value={20}>20分钟</option>
                  <option value={30}>30分钟</option>
                  <option value={45}>45分钟</option>
                  <option value={60}>60分钟</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>空间频率</label>
                <select
                  value={formData.spatial_frequency_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, spatial_frequency_level: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="low">低频 (0.5 cyc/deg)</option>
                  <option value="medium">中频 (2.0 cyc/deg)</option>
                  <option value="high">高频 (4.0 cyc/deg)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>训练模式</label>
                <select
                  value={formData.training_mode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    training_mode: e.target.value,
                    allowed_games: [], // Reset games when mode changes
                  }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="monocular">单眼训练</option>
                  <option value="binocular">双眼训练</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>主导眼</label>
                <select
                  value={formData.dominant_eye}
                  onChange={(e) => setFormData(prev => ({ ...prev, dominant_eye: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="both">双眼</option>
                  <option value="left">左眼</option>
                  <option value="right">右眼</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>开始日期</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>结束日期（可选）</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Game Selection */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2D3748', marginBottom: '8px' }}>选择训练游戏</h3>
            <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
              当前模式: <strong>{formData.training_mode === 'monocular' ? '单眼' : '双眼'}</strong>，仅显示支持该模式的游戏
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {availableGames.map((game) => {
                const isSelected = formData.allowed_games.includes(game.id);
                return (
                  <div
                    key={game.id}
                    onClick={() => toggleGame(game.id)}
                    style={{
                      padding: '16px',
                      border: isSelected ? '2px solid #48BB78' : '2px solid #E2E8F0',
                      borderRadius: '8px',
                      background: isSelected ? '#F0FFF4' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '24px', height: '24px',
                        borderRadius: '4px',
                        background: isSelected ? '#48BB78' : '#E2E8F0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                      }}>
                        {isSelected ? '✓' : ''}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#2D3748', fontSize: '14px' }}>{game.name_cn}</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>{game.name}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {formData.allowed_games.length === 0 && (
              <p style={{ color: '#E53E3E', fontSize: '13px', marginTop: '12px' }}>请至少选择一个游戏</p>
            )}
          </div>

          {/* Instructions */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2D3748', marginBottom: '16px' }}>医嘱说明</h3>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="填写对患者的特殊说明或注意事项..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link
              to={`/doctor/patients/${childId}`}
              style={{
                padding: '14px 24px',
                background: '#E2E8F0',
                color: '#4A5568',
                borderRadius: '8px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading || formData.allowed_games.length === 0}
              style={{
                padding: '14px 24px',
                background: loading || formData.allowed_games.length === 0 ? '#A0AEC0' : '#48BB78',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || formData.allowed_games.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '创建中...' : '创建处方'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
