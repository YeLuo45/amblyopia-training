import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getTrainingPlan, getGameConfigs, updateBackgroundConfig } from '../lib/api';
import { GAMES, GameConfig, TrainingPlan, BACKGROUND_SCENES, DEFAULT_BACKGROUND_ID } from '../types';

export default function GameLobby() {
  const { selectedChild } = useAuth();
  const navigate = useNavigate();
  const [trainingMode, setTrainingMode] = useState<'monocular' | 'binocular'>('monocular');
  const [spatialFrequency, setSpatialFrequency] = useState<'low' | 'medium' | 'high'>('medium');
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [showCoverGuide, setShowCoverGuide] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  // Phase 3: Background selection
  const [selectedBg, setSelectedBg] = useState<Record<string, string>>({});
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [bgSelectorGameId, setBgSelectorGameId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChild) {
      loadConfig();
    }
  }, [selectedChild]);

  async function loadConfig() {
    if (!selectedChild) return;
    try {
      const [planData, configs] = await Promise.all([
        getTrainingPlan(selectedChild.id),
        getGameConfigs(selectedChild.id),
      ]);
      setPlan(planData);
      setGameConfigs(configs);
      if (planData) {
        setTrainingMode(planData.training_mode as 'monocular' | 'binocular');
        setSpatialFrequency(planData.spatial_frequency_level as 'low' | 'medium' | 'high');
      }
      // Load background preferences
      const bgMap: Record<string, string> = {};
      configs.forEach((c: GameConfig) => {
        bgMap[c.game_id] = c.background_id || DEFAULT_BACKGROUND_ID;
      });
      setSelectedBg(bgMap);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  function handleStartGame(gameId: string) {
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;

    if (!game.modes.includes(trainingMode)) {
      alert(`"${game.name_cn}"不支持${trainingMode === 'monocular' ? '单眼' : '双眼'}训练模式`);
      return;
    }

    if (trainingMode === 'monocular') {
      setPendingGameId(gameId);
      setShowCoverGuide(true);
      return;
    }

    doNavigate(gameId);
  }

  function doNavigate(gameId: string) {
    const bgId = selectedBg[gameId] || DEFAULT_BACKGROUND_ID;
    navigate(`/game/${gameId}`, {
      state: {
        trainingMode,
        spatialFrequency,
        childId: selectedChild?.id,
        backgroundId: bgId,
      },
    });
  }

  function confirmCoverGuide() {
    setShowCoverGuide(false);
    if (pendingGameId) {
      doNavigate(pendingGameId);
      setPendingGameId(null);
    }
  }

  function openBgSelector(gameId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setBgSelectorGameId(gameId);
    setShowBgSelector(true);
  }

  async function selectBg(bgId: string) {
    if (!bgSelectorGameId || !selectedChild) return;
    setSelectedBg(prev => ({ ...prev, [bgSelectorGameId]: bgId }));
    try {
      await updateBackgroundConfig(selectedChild.id, bgSelectorGameId, bgId);
    } catch (err) {
      console.error('Failed to save background:', err);
    }
    setShowBgSelector(false);
    setBgSelectorGameId(null);
  }

  const gameIcons: Record<string, string> = {
    'stripe-chase': '\u{1F3C3}',
    'dot-pop': '\u{1F3AF}',
    'fusion-puzzle': '\u{1F9E9}',
    'memory-flip': '\u{1F0CF}',
    'draw-line': '\u270F\uFE0F',
    'accommodation-lift': '\u{1F388}',
    'sf-matching': '\u25FB\uFE0F',
    'depth-blocks': '\u{1F9F1}',
    'visual-search-maze': '\u{1F50D}',
    'quick-match': '\u26A1',
  };

  const currentBgId = bgSelectorGameId ? (selectedBg[bgSelectorGameId] || DEFAULT_BACKGROUND_ID) : DEFAULT_BACKGROUND_ID;

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
            弱视训练 · {selectedChild?.name}
          </div>
          <nav className="nav-links">
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, padding: '8px 12px', borderRadius: 'var(--radius)' }}>
              ← 返回
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
        {/* Training Mode */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>训练模式</h2>
          <div className="mode-toggle">
            <button className={trainingMode === 'monocular' ? 'active' : ''} onClick={() => setTrainingMode('monocular')}>
              👁️ 单眼遮盖
            </button>
            <button className={trainingMode === 'binocular' ? 'active' : ''} onClick={() => setTrainingMode('binocular')}>
              👀 双眼同视
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
            {trainingMode === 'monocular' ? '遮盖优势眼，强制使用弱视眼进行训练' : '双眼同时视物，训练双眼协同和融合功能'}
          </p>
        </div>

        {/* Spatial Frequency */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>空间频率</h2>
          <div className="frequency-selector">
            {(['low', 'medium', 'high'] as const).map(freq => (
              <div key={freq} className={`frequency-btn ${spatialFrequency === freq ? 'active' : ''}`} onClick={() => setSpatialFrequency(freq)}>
                <div className="value">{freq === 'low' ? '0.5' : freq === 'medium' ? '2.0' : '4.0'}</div>
                <div className="label">{freq === 'low' ? '低频' : freq === 'medium' ? '中频' : '高频'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Grid */}
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>选择游戏开始训练</h2>
        <div className="game-grid">
          {GAMES.map(game => {
            const config = gameConfigs.find(c => c.game_id === game.id);
            const isDisabled = config && !config.is_enabled;
            const supportsMode = game.modes.includes(trainingMode);
            const bgId = selectedBg[game.id] || DEFAULT_BACKGROUND_ID;
            const bgPreview = BACKGROUND_SCENES.find(b => b.id === bgId) || BACKGROUND_SCENES[0];

            return (
              <div
                key={game.id}
                className="game-card"
                onClick={() => !isDisabled && supportsMode && handleStartGame(game.id)}
                style={{
                  opacity: isDisabled ? 0.5 : supportsMode ? 1 : 0.6,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                <div className="game-preview" style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Background preview */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(135deg, ${bgPreview.colors?.[0] || '#1a1a2e'} 0%, ${bgPreview.colors?.[1] || '#16213e'} 50%, ${bgPreview.colors?.[2] || '#0f3460'} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 48, position: 'relative', zIndex: 1 }}>{gameIcons[game.id] || '\u{1F3AE}'}</span>
                  </div>
                  {/* Background selector button */}
                  <button
                    onClick={(e) => openBgSelector(game.id, e)}
                    title="更换背景"
                    style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 2,
                      background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
                      width: 32, height: 32, cursor: 'pointer', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {bgPreview.emoji}
                  </button>
                </div>
                <div className="game-info">
                  <div className="game-name">{game.name_cn}</div>
                  <div className="game-desc">{game.description}</div>
                  <div className="game-tags">
                    {game.training_types.slice(0, 2).map(t => (
                      <span key={t} className="tag primary">{t.replace(/-/g, ' ')}</span>
                    ))}
                    {!supportsMode && <span className="tag" style={{ color: 'var(--danger)' }}>不支持此模式</span>}
                    {isDisabled && <span className="tag" style={{ color: 'var(--danger)' }}>已禁用</span>}
                  </div>
                  {game.target_score && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      目标分数: {game.target_score}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cover Guide Modal */}
      {showCoverGuide && (
        <div className="cover-guide">
          <div className="eye-icon">👁️</div>
          <h2>准备单眼训练</h2>
          <p>
            请用眼贴遮住孩子的非训练眼（另一只眼睛）。<br/><br/>
            确保眼贴贴紧，不会透光。<br/>
            训练过程中请保持遮盖状态。
          </p>
          <button className="btn btn-primary" onClick={confirmCoverGuide}>
            我已准备好，开始训练
          </button>
        </div>
      )}

      {/* Background Selector Modal */}
      {showBgSelector && bgSelectorGameId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }} onClick={() => setShowBgSelector(false)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 32, maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>选择游戏背景</h2>
              <button onClick={() => setShowBgSelector(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {BACKGROUND_SCENES.map(bg => {
                const isSelected = bg.id === currentBgId;
                return (
                  <div
                    key={bg.id}
                    onClick={() => selectBg(bg.id)}
                    style={{
                      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      border: isSelected ? '3px solid var(--primary)' : '2px solid var(--border)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      height: 80,
                      background: `linear-gradient(135deg, ${bg.colors?.[0] || '#1a1a2e'} 0%, ${bg.colors?.[1] || '#16213e'} 50%, ${bg.colors?.[2] || '#0f3460'} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 32 }}>{bg.emoji}</span>
                    </div>
                    <div style={{ padding: '8px 4px', textAlign: 'center', fontSize: 12, fontWeight: 500, color: isSelected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {bg.name_cn}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
