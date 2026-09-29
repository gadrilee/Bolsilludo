'use client';

import { useState, useTransition } from 'react';
import { parseCSV, parseOFX } from '@/lib/imports/parsers';
import { createImportBatch, commitImportBatch, cancelImportBatch, resolveImportRow } from '../actions/imports';
import type { NormalizedImportTransaction } from '@/lib/imports/types';

type ImportWizardProps = {
  budgetId: string;
  accountId: string;
  accountName: string;
  userId: string;
  onClose: () => void;
  pendingBatch?: { batch: any, rows: any[] } | null;
};

export function ImportWizard({ budgetId, accountId, accountName, userId, onClose, pendingBatch }: ImportWizardProps) {
  const [step, setStep] = useState(pendingBatch ? 4 : 1);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<NormalizedImportTransaction[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // CSV mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ date: '', amount: '', payee: '', memo: '', skipRows: 1 });

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    
    if (f.size > 5 * 1024 * 1024) {
      setError('IMPORT_FILE_TOO_LARGE');
      return;
    }

    setFile(f);
    setError(null);
    const text = await f.text();
    setFileContent(text);

    if (f.name.endsWith('.csv')) {
      const firstLines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5);
      if (firstLines.length > 0) {
        const headers = firstLines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        setCsvHeaders(headers);
        
        // Auto-guess columns
        const guess = { date: '', amount: '', payee: '', memo: '' };
        headers.forEach(h => {
          const l = h.toLowerCase();
          if (l.includes('date') || l.includes('fecha')) guess.date = h;
          if (l.includes('amount') || l.includes('monto') || l.includes('valor')) guess.amount = h;
          if (l.includes('payee') || l.includes('description') || l.includes('descripción') || l.includes('comercio')) guess.payee = h;
          if (l.includes('memo') || l.includes('nota')) guess.memo = h;
        });
        setMapping({ ...mapping, ...guess });
      }
      setStep(2); // Map columns
    } else if (f.name.endsWith('.ofx') || f.name.endsWith('.qfx')) {
      const rows = parseOFX(text);
      setParsedRows(rows);
      setStep(3); // Preview
    } else {
      setError('IMPORT_UNSUPPORTED_FORMAT');
    }
  }

  function handleMapSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const rows = parseCSV(fileContent, mapping);
      setParsedRows(rows);
      setError(null);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleCreateBatch() {
    startTransition(async () => {
      try {
        const sourceType = file!.name.endsWith('.csv') ? 'CSV' : file!.name.endsWith('.ofx') ? 'OFX' : 'QFX';
        await createImportBatch(budgetId, accountId, sourceType, file!.name, fileContent, parsedRows, userId);
        setStep(4); // The review step relies on reloading to get the `pendingBatch` from DB
        onClose(); // In a real app we'd fetch the new batch and show step 4. For MVP we close and let the main page show the active batch.
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  // --- REVIEW STEP (Step 4) ---
  if (pendingBatch && step === 4) {
    const { batch, rows } = pendingBatch;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Revisar Importación: {accountName}</h2>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--glass-bg)', borderRadius: '0.5rem', flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Nuevas / Emparejadas</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{batch.acceptedRows}</p>
            </div>
            <div style={{ padding: '1rem', background: 'var(--glass-bg)', borderRadius: '0.5rem', flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Duplicados</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{batch.duplicateRows}</p>
            </div>
            <div style={{ padding: '1rem', background: 'var(--glass-bg)', borderRadius: '0.5rem', flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total a procesar</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{batch.totalRows}</p>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', maxHeight: '40vh', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <tr>
                  <th style={{ padding: '0.75rem' }}>Fecha</th>
                  <th style={{ padding: '0.75rem' }}>Comercio</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monto</th>
                  <th style={{ padding: '0.75rem' }}>Estado</th>
                  <th style={{ padding: '0.75rem' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{r.postedDate || r.authorizedDate}</td>
                    <td style={{ padding: '0.75rem' }}>{r.normalizedPayee || r.rawDescription}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: Number(r.amountMinor) >= 0 ? 'var(--primary)' : 'var(--text)' }}>
                      {(Number(r.amountMinor) / 100).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {r.decision === 'DUPLICATE' ? <span style={{ color: 'var(--text-muted)' }}>Duplicado</span> :
                       r.decision === 'MATCHED' ? <span style={{ color: 'var(--primary)' }}>Emparejado</span> :
                       <span style={{ color: 'var(--text)' }}>Nuevo</span>}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <select 
                        value={r.decision}
                        onChange={(e) => startTransition(() => resolveImportRow(r.id, e.target.value as any))}
                        style={{ padding: '0.25rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.25rem', color: 'var(--text)' }}
                      >
                        <option value="NEW">Nuevo</option>
                        <option value="MATCHED">Emparejado</option>
                        <option value="DUPLICATE">Omitir (Duplicado)</option>
                        <option value="REJECTED">Rechazar</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => startTransition(() => { cancelImportBatch(batch.id); onClose(); })}
              style={{ padding: '0.75rem 1rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '0.5rem', cursor: 'pointer' }}
              disabled={isPending}
            >
              Cancelar Importación
            </button>
            <button 
              onClick={() => startTransition(() => { commitImportBatch(batch.id); onClose(); })}
              style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
              disabled={isPending}
            >
              {isPending ? 'Aplicando...' : 'Aplicar Transacciones'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- WIZARD STEPS 1-3 ---
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem' }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Importar a {accountName}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {step === 1 && (
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>Sube un archivo OFX, QFX o CSV exportado desde tu banco.</p>
            <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
              <input type="file" accept=".csv,.ofx,.qfx" onChange={handleFileSelect} id="file-upload" style={{ display: 'none' }} />
              <label htmlFor="file-upload" style={{ cursor: 'pointer', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', fontWeight: 600 }}>
                Seleccionar Archivo
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleMapSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mapea las columnas de tu CSV.</p>
            
            {(['date', 'amount', 'payee', 'memo'] as const).map(field => (
              <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>{field.charAt(0).toUpperCase() + field.slice(1)} {field === 'memo' ? '(Opcional)' : '*'}</label>
                <select 
                  required={field !== 'memo'}
                  value={(mapping as any)[field]}
                  onChange={e => setMapping({...mapping, [field]: e.target.value})}
                  style={{ width: '250px', padding: '0.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}
                >
                  <option value="">-- Seleccionar columna --</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
                Continuar
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Se detectaron <strong>{parsedRows.length}</strong> transacciones válidas.</p>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              {parsedRows.slice(0, 5).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                  <span>{r.postedDate}</span>
                  <span style={{ flex: 1, margin: '0 1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.rawDescription}</span>
                  <span style={{ fontWeight: 600, color: r.amountMinor >= BigInt(0) ? 'var(--primary)' : 'var(--text)' }}>{(Number(r.amountMinor)/100).toFixed(2)}</span>
                </div>
              ))}
              {parsedRows.length > 5 && (
                <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Y {parsedRows.length - 5} filas más...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                Volver
              </button>
              <button 
                onClick={handleCreateBatch} 
                disabled={isPending}
                style={{ flex: 2, padding: '0.75rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {isPending ? 'Analizando duplicados...' : 'Analizar e Importar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
