import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctorPatients, getDoctorProfile, searchPatients, addDoctorPatient, removeDoctorPatient } from '../../lib/api';

interface Patient {
  id: string;
  name: string;
  gender: string;
  birth_date?: string;
  eye_condition: string;
  treatment_phase: string;
  total_sessions?: number;
  last_session?: string;
  plan_active?: boolean;
  daily_duration?: number;
  weekly_frequency?: number;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [patientsData, profileData] = await Promise.all([
        getDoctorPatients(),
        getDoctorProfile(),
      ]);
      setPatients(patientsData);
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to load data:', err);
      // If not logged in, redirect
      navigate('/doctor/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchPatients(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  }

  async function handleAddPatient(childId: string) {
    try {
      await addDoctorPatient(childId);
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
      loadData();
    } catch (err: any) {
      alert(err.message || '添加失败');
    }
  }

  async function handleRemovePatient(childId: string, name: string) {
    if (!confirm(`确定要移除患者 ${name} 吗？`)) return;
    try {
      await removeDoctorPatient(childId);
      loadData();
    } catch (err: any) {
      alert(err.message || '移除失败');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('doctorProfile');
    navigate('/doctor/login');
  }

  function getAge(birthDate?: string): number {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function getEyeConditionLabel(condition: string): string {
    const map: Record<string, string> = {
      refractive: '屈光不正',
      strabismic: '斜视',
      deprivation: '形觉剥夺',
      mixed: '混合型',
      unknown: '未知',
    };
    return map[condition] || condition;
  }

  function getPhaseLabel(phase: string): string {
    const map: Record<string, string> = {
      initial: '初始期',
      intensive: '强化期',
      maintenance: '维持期',
    };
    return map[phase] || phase;
  }

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '28px' }}>👨‍⚕️</span>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A365D' }}>医生工作台</h1>
              <p style={{ fontSize: '14px', color: '#718096' }}>
                {profile?.name || profile?.nickname || '医生'} · {profile?.hospital || ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 20px',
                background: '#48BB78',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + 添加患者
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                background: '#E2E8F0',
                color: '#4A5568',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2D3748' }}>我的患者 ({patients.length})</h2>
        </div>

        {patients.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#4A5568', marginBottom: '8px' }}>
              暂无患者
            </h3>
            <p style={{ color: '#718096', marginBottom: '24px' }}>
              点击"添加患者"来分配患者到您的账号
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '12px 24px',
                background: '#48BB78',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + 添加患者
            </button>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F7FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>姓名</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>年龄</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>眼类型</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>阶段</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>训练次数</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>最近训练</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>处方状态</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#4A5568' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                    onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: patient.gender === 'male' ? '#EBF8FF' : '#FFF5F5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '16px',
                        }}>
                          {patient.gender === 'male' ? '👦' : '👧'}
                        </div>
                        <span style={{ fontWeight: 500, color: '#2D3748' }}>{patient.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#718096', fontSize: '14px' }}>
                      {getAge(patient.birth_date)}岁
                    </td>
                    <td style={{ padding: '14px 16px', color: '#718096', fontSize: '14px' }}>
                      {getEyeConditionLabel(patient.eye_condition)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: patient.treatment_phase === 'intensive' ? '#FED7E2' :
                          patient.treatment_phase === 'maintenance' ? '#C6F6D5' : '#BEE3F8',
                        color: patient.treatment_phase === 'intensive' ? '#97266D' :
                          patient.treatment_phase === 'maintenance' ? '#276749' : '#2B6CB0',
                      }}>
                        {getPhaseLabel(patient.treatment_phase)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#718096', fontSize: '14px' }}>
                      {patient.total_sessions || 0}次
                    </td>
                    <td style={{ padding: '14px 16px', color: '#718096', fontSize: '14px' }}>
                      {patient.last_session ? new Date(patient.last_session).toLocaleDateString('zh-CN') : '暂无'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: patient.plan_active ? '#C6F6D5' : '#E2E8F0',
                        color: patient.plan_active ? '#276749' : '#718096',
                      }}>
                        {patient.plan_active ? '进行中' : '无处方'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                          style={{
                            padding: '6px 12px',
                            background: '#EBF8FF',
                            color: '#2B6CB0',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleRemovePatient(patient.id, patient.name)}
                          style={{
                            padding: '6px 12px',
                            background: '#FED7D7',
                            color: '#C53030',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          移除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '480px',
            maxHeight: '80vh',
            overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>添加患者</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索患者姓名或家庭名称..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            {searchResults.length > 0 && (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{result.name}</div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>
                        {result.family_name} · {getEyeConditionLabel(result.eye_condition)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddPatient(result.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#48BB78',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      添加
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                未找到匹配的患者
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
