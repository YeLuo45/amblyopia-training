import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ChildSelect() {
  const { childList, selectedChild, selectChild } = useAuth();
  const navigate = useNavigate();

  function handleSelect(child: typeof childList[0]) {
    selectChild(child);
    navigate('/games');
  }

  return (
    <div className="app">
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
        </div>
      </header>

      <div style={{
        minHeight: 'calc(100vh - 73px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <h1 style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>
          👋 欢迎回来！
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 40, textAlign: 'center' }}>
          请选择要训练的小朋友
        </p>

        {childList.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              还没有添加小朋友，点击下方按钮添加
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/settings?tab=children')}
            >
              添加儿童档案
            </button>
          </div>
        ) : (
          <div className="child-selector" style={{ justifyContent: 'center' }}>
            {childList.map(child => (
              <div
                key={child.id}
                className={`child-card ${selectedChild?.id === child.id ? 'selected' : ''}`}
                onClick={() => handleSelect(child)}
                style={{ padding: '20px 32px' }}
              >
                <div className="child-avatar" style={{ width: 60, height: 60, fontSize: 24 }}>
                  {child.name.charAt(0)}
                </div>
                <div className="child-info">
                  <div className="name" style={{ fontSize: 18 }}>{child.name}</div>
                  <div className="meta">
                    {child.age ? `${child.age}岁` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => navigate('/dashboard')}
          style={{ marginTop: 32 }}
        >
          返回家长端
        </button>
      </div>
    </div>
  );
}
