import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFhirPatient, getFhirObservations, getFhirCarePlan } from '../../lib/api';

export default function FhirExport() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fhirData, setFhirData] = useState<any>(null);
  const [exportType, setExportType] = useState<'Patient' | 'Observation' | 'CarePlan'>('Observation');
  const [params, setParams] = useState({
    dateFrom: '',
    dateTo: '',
    _count: 100,
  });

  async function handleExport() {
    if (!childId) return;
    setLoading(true);
    try {
      let data: any;
      switch (exportType) {
        case 'Patient':
          data = await getFhirPatient(childId);
          break;
        case 'CarePlan':
          data = await getFhirCarePlan(childId);
          break;
        case 'Observation':
          data = await getFhirObservations({ childId, dateFrom: params.dateFrom || undefined, dateTo: params.dateTo || undefined, _count: params._count });
          break;
      }
      setFhirData(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadJSON() {
    if (!fhirData) return;
    const blob = new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportType}_${childId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo">👨‍⚕️ 弱视训练 · FHIR导出</div>
          <nav className="nav-links">
            <button
              onClick={() => navigate(`/doctor/patients/${childId}`)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ← 返回
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="card-title">FHIR R4 数据导出</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            导出符合 HL7 FHIR R4 标准的数据，可用于与医院信息系统对接。
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['Patient', 'Observation', 'CarePlan'] as const).map(type => (
              <button
                key={type}
                className={exportType === type ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => { setExportType(type); setFhirData(null); }}
              >
                {type === 'Patient' ? '患者信息' : type === 'Observation' ? '训练记录' : '训练处方'}
              </button>
            ))}
          </div>

          {exportType === 'Observation' && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                type="date"
                value={params.dateFrom}
                onChange={e => setParams({ ...params, dateFrom: e.target.value })}
                placeholder="开始日期"
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <input
                type="date"
                value={params.dateTo}
                onChange={e => setParams({ ...params, dateTo: e.target.value })}
                placeholder="结束日期"
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <input
                type="number"
                value={params._count}
                onChange={e => setParams({ ...params, _count: Number(e.target.value) })}
                placeholder="最大记录数"
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', width: 120 }}
              />
            </div>
          )}

          <button className="btn btn-primary" onClick={handleExport} disabled={loading}>
            {loading ? '导出中...' : '获取 FHIR 数据'}
          </button>
        </div>

        {fhirData && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="card-title" style={{ margin: 0 }}>FHIR {exportType} 资源</h3>
              <button className="btn btn-sm btn-primary" onClick={downloadJSON}>
                下载 JSON
              </button>
            </div>
            <pre style={{
              background: 'var(--bg-secondary)',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              maxHeight: 500,
              fontSize: 12,
              fontFamily: 'monospace',
            }}>
              {JSON.stringify(fhirData, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
