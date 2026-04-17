import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doctorLogin, doctorRegister } from '../../lib/api';

export default function DoctorLoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [hospital, setHospital] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await doctorLogin(email, password);
        localStorage.setItem('token', res.token);
        localStorage.setItem('userRole', 'doctor');
        localStorage.setItem('doctorProfile', JSON.stringify(res.profile));
        navigate('/doctor/dashboard');
      } else {
        await doctorRegister({ email, password, nickname: name, hospital, specialty });
        // Auto login after register
        const res = await doctorLogin(email, password);
        localStorage.setItem('token', res.token);
        localStorage.setItem('userRole', 'doctor');
        localStorage.setItem('doctorProfile', JSON.stringify(res.profile));
        navigate('/doctor/dashboard');
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2C5282 0%, #1A365D 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍⚕️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1A365D', marginBottom: '8px' }}>
            医生端
          </h1>
          <p style={{ color: '#718096', fontSize: '14px' }}>
            {isLogin ? '登录您的医生账号' : '注册新医生账号'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FED7D7',
            color: '#C53030',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>
                  姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
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
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>
                  医院
                </label>
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="请输入医院名称"
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
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>
                  专业
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="如：斜弱视、小儿眼科"
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
            </>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
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

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#4A5568' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              minLength={6}
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#A0AEC0' : '#2C5282',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4A90E2',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {isLogin ? '没有账号？立即注册' : '已有账号？立即登录'}
          </button>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link to="/auth" style={{ color: '#718096', fontSize: '14px', textDecoration: 'none' }}>
            返回家长端登录
          </Link>
        </div>
      </div>
    </div>
  );
}
