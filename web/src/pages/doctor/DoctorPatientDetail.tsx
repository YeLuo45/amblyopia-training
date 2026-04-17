import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPatientReport, getPatientProgress, getPatientPrescriptions, getFhirExport, updatePrescription } from '../../lib/api';
import { GAMES } from '../../types';

interface ReportData {
  child: any;
  summary: any;
  game_breakdown: any[];
  weekly_trend: any[];
  active_plan: any;
}

export default function DoctorPatientDetail() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [childId]);

  async function loadData() {
    if (!childId) return;
    try {
      const [reportData, progressData, prescriptionsData] = await Promise.all([
        getPatientReport(childId),
        getPatientProgress(childId),
        getPatientPrescriptions(childId),
      ]);
      setReport(reportData);
      setProgress(progressData);
      setPrescriptions(prescriptionsData);
    } catch (err) {
      console.error('Failed to load patient data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportFHIR() {
    if (!childId) return;
    try {
      const bundle = await getFhirExport(childId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-${childId}-fhir.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('FHIR export failed:', err);
      alert('导出失败');
    }
  }

  async function handlePausePrescription(prescriptionId: string) {
    try {
      await updatePrescription(prescriptionId, { status: 'paused' });
      loadData();
    } catch (err) {
      console.error('Failed to pause prescription:', err);
    }
  }

  async function handleResumePrescription(prescriptionId: string) {
    try {
      await updatePrescription(prescriptionId, { status: 'active' });
      loadData();
    } catch (err) {
      console.error('Failed to resume prescription:', err);
    }
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

  function getGameName(gameId: string): string {
    const game = GAMES.find(g => g.id === gameId);
    return game?.name_cn || gameId;
  }

  function getPhaseLabel(phase: string): string {
    const map: Record<string, string> = {
      initial: '初始期',
      intensive: '强化期',
      maintenance: '维持期',
    };
    return map[phase] || phase;
  }

  function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      active: '进行中',
      paused: '已暂停',
      completed: '已完成',
    };
    return map[status] || status;
  }

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>无法加载患者数据</p>
      </div>
    );
  }

  const child = report.child || {};

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
            <button onClick={() => navigate('/doctor/dashboard')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A365D' }}>{child.name}</h1>
              <p style={{ fontSize: '14px', color: '#718096' }}>
                {getEyeConditionLabel(child.eye_condition)} · {getPhaseLabel(child.treatment_phase)}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportFHIR}
            style={{
              padding: '10px 20px',
              background: '#805AD5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📥 导出FHIR
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>训练天数</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2D3748' }}>{report.summary?.training_days || 0}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>训练次数</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2D3748' }}>{report.summary?.total_sessions || 0}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>平均得分</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2D3748' }}>{Math.round(report.summary?.avg_score || 0)}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>平均准确率</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2D3748' }}>{Math.round(report.summary?.avg_accuracy || 0)}%</div>
          </div>
        </div>

        {/* Game Breakdown */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2D3748', marginBottom: '16px' }}>各游戏表现（近30天）</h3>
          {report.game_breakdown && report.game_breakdown.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#718096' }}>游戏</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>次数</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>平均分</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>总时长</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>准确率</th>
                </tr>
              </thead>
              <tbody>
                {report.game_breakdown.map((game: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '10px', fontSize: '14px', color: '#2D3748' }}>{getGameName(game.game_id)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px', color: '#718096' }}>{game.sessions}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px', color: '#718096' }}>{Math.round(game.avg_score)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px', color: '#718096' }}>{Math.round(game.total_minutes)}分钟</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px', color: '#718096' }}>{Math.round(game.avg_accuracy)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>暂无训练数据</p>
          )}
        </div>

        {/* Training Records Link */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2D3748', marginBottom: '4px' }}>训练记录</h3>
              <p style={{ fontSize: '14px', color: '#718096' }}>查看详细训练历史</p>
            </div>
            <Link
              to={`/doctor/patients/${childId}/sessions`}
              style={{
                padding: '10px 20px',
                background: '#EBF8FF',
                color: '#2B6CB0',
                borderRadius: '8px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              查看详情 →
            </Link>
          </div>
        </div>

        {/* Prescriptions */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2D3748' }}>处方管理</h3>
            <Link
              to={`/doctor/prescriptions/new?childId=${childId}`}
              style={{
                padding: '10px 20px',
                background: '#48BB78',
                color: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              + 新建处方
            </Link>
          </div>

          {prescriptions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {prescriptions.map((rx: any) => (
                <div key={rx.id} style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: '#2D3748', marginBottom: '4px' }}>{rx.plan_name}</div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>
                      每日{rx.daily_duration}分钟 · {rx.spatial_frequency_level === 'low' ? '低频' : rx.spatial_frequency_level === 'medium' ? '中频' : '高频'} · {rx.training_mode === 'monocular' ? '单眼' : '双眼'}模式
                    </div>
                    <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '4px' }}>
                      创建于 {new Date(rx.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: rx.status === 'active' ? '#C6F6D5' : rx.status === 'paused' ? '#FEEBC8' : '#E2E8F0',
                      color: rx.status === 'active' ? '#276749' : rx.status === 'paused' ? '#C05621' : '#718096',
                    }}>
                      {getStatusLabel(rx.status)}
                    </span>
                    {rx.status === 'active' && (
                      <button
                        onClick={() => handlePausePrescription(rx.id)}
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
                        暂停
                      </button>
                    )}
                    {rx.status === 'paused' && (
                      <button
                        onClick={() => handleResumePrescription(rx.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#C6F6D5',
                          color: '#276749',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        恢复
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>暂无处方</p>
          )}
        </div>
      </main>
    </div>
  );
}
