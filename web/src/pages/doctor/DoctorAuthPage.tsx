import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorLogin, doctorRegister } from '../../lib/api';

export default function DoctorAuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    nickname: '',
    hospital: '',
    specialty: '',
    license_number: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await doctorLogin(form.email, form.password);
        localStorage.setItem('doctor_token', res.token);
        localStorage.setItem('doctor_user', JSON.stringify(res.user));
        navigate('/doctor/dashboard');
      } else {
        if (!form.email || !form.password || form.password.length < 6) {
          setError('请填写邮箱和至少6位密码');
          setLoading(false);
          return;
        }
        const res = await doctorRegister(form);
        localStorage.setItem('doctor_token', res.token);
        localStorage.setItem('doctor_user', JSON.stringify(res.user));
        navigate('/doctor/dashboard');
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">👨‍⚕️</div>
          <h1>医生端</h1>
          <p>弱视训练管理系统</p>
        </div>

        <div className="auth-tabs">
          <button className={isLogin ? 'active' : ''} onClick={() => setIsLogin(true)}>登录</button>
          <button className={!isLogin ? 'active' : ''} onClick={() => setIsLogin(false)}>注册</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="doctor@hospital.com"
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>姓名（选填）</label>
                <input
                  type="text"
                  value={form.nickname}
                  onChange={e => setForm({ ...form, nickname: e.target.value })}
                  placeholder="张医生"
                />
              </div>

              <div className="form-group">
                <label>医院（选填）</label>
                <input
                  type="text"
                  value={form.hospital}
                  onChange={e => setForm({ ...form, hospital: e.target.value })}
                  placeholder="XX医院"
                />
              </div>

              <div className="form-group">
                <label>科室（选填）</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={e => setForm({ ...form, specialty: e.target.value })}
                  placeholder="眼科"
                />
              </div>

              <div className="form-group">
                <label>执业证号（选填）</label>
                <input
                  type="text"
                  value={form.license_number}
                  onChange={e => setForm({ ...form, license_number: e.target.value })}
                  placeholder="执业证号"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={() => navigate('/auth')} style={{ color: '#4A90E2', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← 返回家长端
          </button>
        </div>
      </div>
    </div>
  );
}
