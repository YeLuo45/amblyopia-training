import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchPatients, addDoctorPatient } from '../../lib/api';

interface SearchResult {
  id: string;
  name: string;
  gender: string;
  birth_date?: string;
  eye_condition: string;
  family_name?: string;
}

export default function AddPatient() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.length < 2) return;
    setLoading(true);
    setError('');
    try {
      const data = await searchPatients(query);
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(childId: string) {
    setAdding(childId);
    try {
      await addDoctorPatient(childId);
      navigate('/doctor/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(null);
    }
  }

  const eyeConditionLabels: Record<string, string> = {
    refractive: '屈光不正',
    strabismic: '斜视性',
    deprivation: '形觉剥夺',
    mixed: '混合性',
    unknown: '未知',
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo">👨‍⚕️ 弱视训练 · 医生端</div>
          <nav className="nav-links">
            <button
              onClick={() => navigate('/doctor/dashboard')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ← 返回
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <div className="card">
          <h2 className="card-title">添加患者</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            搜索已注册的家庭中的儿童，输入姓名或家庭名称进行查找。
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="输入患者姓名或家庭名称..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15 }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || query.length < 2}>
              {loading ? '搜索中...' : '搜索'}
            </button>
          </form>

          {error && <div style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}

          {results.length === 0 && query.length >= 2 && !loading && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
              未找到匹配的患者
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map(patient => (
              <div key={patient.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{patient.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {patient.gender === 'male' ? '男' : patient.gender === 'female' ? '女' : '其他'} · {eyeConditionLabels[patient.eye_condition] || patient.eye_condition}
                    {patient.family_name && ` · 家庭: ${patient.family_name}`}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleAdd(patient.id)}
                  disabled={adding === patient.id}
                >
                  {adding === patient.id ? '添加中...' : '添加'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
