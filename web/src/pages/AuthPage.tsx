import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    phone: '',
    password: '',
    nickname: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.phone, form.password);
      } else {
        await register(form);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👁️</div>
          <h1>弱视训练</h1>
          <p className="subtitle">面向家庭的医学级视觉训练平台</p>
        </div>

        <div className="disclaimer">
          ⚠️ 本产品为辅助训练工具，不替代专业诊疗。请在眼科医生指导下使用。
        </div>

        <div className="mode-toggle" style={{ marginBottom: 24 }}>
          <button
            className={isLogin ? 'active' : ''}
            onClick={() => setIsLogin(true)}
          >
            登录
          </button>
          <button
            className={!isLogin ? 'active' : ''}
            onClick={() => setIsLogin(false)}
          >
            注册
          </button>
        </div>

        {error && (
          <div style={{
            background: '#FED7D7',
            color: '#C53030',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>手机号</label>
            <input
              type="tel"
              placeholder="请输入手机号"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              maxLength={20}
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>昵称（可选）</label>
              <input
                type="text"
                placeholder="请输入昵称"
                value={form.nickname}
                onChange={e => setForm({ ...form, nickname: e.target.value })}
                maxLength={50}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}>
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600,
              marginLeft: 4,
            }}
          >
            {isLogin ? '立即注册' : '登录'}
          </button>
        </p>

        <p style={{
          textAlign: 'center',
          marginTop: 16,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}>
          医生？
          <button
            onClick={() => navigate('/doctor/auth')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600,
              marginLeft: 4,
            }}
          >
            医生端登录 →
          </button>
        </p>
      </div>
    </div>
  );
}
