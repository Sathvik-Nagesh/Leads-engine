'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface MappedColumn {
  targetField: string;
  sourceColumn: string;
}

const FIELD_OPTIONS = [
  { key: 'companyName', label: 'Company Name', required: true },
  { key: 'website',     label: 'Website / Domain', required: false },
  { key: 'phone',       label: 'Phone Number', required: false },
  { key: 'email',       label: 'Email Address', required: false },
  { key: 'city',        label: 'City / Location', required: false },
  { key: 'state',       label: 'State / Province', required: false },
  { key: 'industry',    label: 'Industry / Category', required: false },
];

export default function SourcesPage() {
  const [activeTab, setActiveTab] = useState<'excel' | 'paste' | 'gmaps'>('excel');
  
  // Excel File State
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({
    companyName: '',
    website: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    industry: '',
  });

  // Paste CSV State
  const [csvContent, setCsvContent] = useState('');
  
  // Import Status
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect columns based on header names
  const autoDetectMappings = (cols: string[]) => {
    const newMappings: Record<string, string> = { ...mappings };
    cols.forEach((col) => {
      const lower = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!newMappings.companyName && (lower.includes('company') || lower.includes('business') || lower.includes('name'))) {
        newMappings.companyName = col;
      } else if (!newMappings.website && (lower.includes('website') || lower.includes('domain') || lower.includes('url'))) {
        newMappings.website = col;
      } else if (!newMappings.phone && (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel'))) {
        newMappings.phone = col;
      } else if (!newMappings.email && (lower.includes('email') || lower.includes('mail'))) {
        newMappings.email = col;
      } else if (!newMappings.city && (lower.includes('city') || lower.includes('location'))) {
        newMappings.city = col;
      } else if (!newMappings.state && lower.includes('state')) {
        newMappings.state = col;
      } else if (!newMappings.industry && (lower.includes('industry') || lower.includes('category'))) {
        newMappings.industry = col;
      }
    });
    setMappings(newMappings);
  };

  const handleFileDrop = (droppedFile: File) => {
    setFile(droppedFile);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setSheetNames(workbook.SheetNames);
        
        const firstSheet = workbook.SheetNames[0];
        setSelectedSheet(firstSheet);
        
        const worksheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        
        if (json.length === 0) {
          setError('File appears to be empty or contains no readable rows');
          return;
        }

        const detectedCols = Object.keys(json[0] || {});
        setColumns(detectedCols);
        setRawRows(json);
        autoDetectMappings(detectedCols);
      } catch (err: any) {
        setError(`Failed to read file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(droppedFile);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
      if (json.length > 0) {
        const detectedCols = Object.keys(json[0] || {});
        setColumns(detectedCols);
        setRawRows(json);
        autoDetectMappings(detectedCols);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelImport = async () => {
    if (!mappings.companyName && !mappings.website) {
      setError('Please map at least Company Name or Website column');
      return;
    }

    setImporting(true);
    setError(null);

    // Convert mapped rows to standard CSV text format for endpoint
    const headerRow = ['Company', 'Website', 'Phone', 'Email', 'City', 'State', 'Industry'].join(',');
    const csvRows = rawRows.map((row) => {
      return [
        `"${(row[mappings.companyName] || '').toString().replace(/"/g, '""')}"`,
        `"${(row[mappings.website] || '').toString().replace(/"/g, '""')}"`,
        `"${(row[mappings.phone] || '').toString().replace(/"/g, '""')}"`,
        `"${(row[mappings.email] || '').toString().replace(/"/g, '""')}"`,
        `"${(row[mappings.city] || '').toString().replace(/"/g, '""')}"`,
        `"${(row[mappings.state] || '').toString().replace(/"/g, '""')}"`,
        `"${(row[mappings.industry] || '').toString().replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvText = [headerRow, ...csvRows].join('\n');

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'csv',
          csvContent: csvText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Lead Ingestion & Data Sources
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Import leads from Excel sheets (.xlsx, .xls), CSV lists, or automated Google Places discovery
        </p>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('excel')}
          className={`btn ${activeTab === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📊 Excel / CSV File Dropzone
        </button>
        <button
          onClick={() => setActiveTab('paste')}
          className={`btn ${activeTab === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📝 Direct Paste CSV
        </button>
        <button
          onClick={() => setActiveTab('gmaps')}
          className={`btn ${activeTab === 'gmaps' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📍 Google Maps Places Search
        </button>
      </div>

      {/* Tab 1: Excel Dropzone */}
      {activeTab === 'excel' && (
        <div style={{ display: 'grid', gridTemplateColumns: rawRows.length > 0 ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* File Upload Dropzone Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              1. Upload Excel or CSV File
            </h3>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileDrop(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-hover)',
                borderRadius: 'var(--radius-lg)',
                padding: '3rem 2rem',
                textAlign: 'center',
                background: 'var(--bg-surface-elevated)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileDrop(e.target.files[0]);
                }}
              />
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {file ? file.name : 'Drag & Drop Excel (.xlsx, .csv) File Here'}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB • ${rawRows.length} Rows Detected` : 'Click to browse or drop file from your computer'}
              </p>
            </div>

            {/* Sheet Selector if Multi-sheet */}
            {sheetNames.length > 1 && (
              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Select Sheet
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.4rem',
                    padding: '0.6rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {sheetNames.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Column Mapping & Preview */}
          {rawRows.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                2. Map File Columns to Lead Schema
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {FIELD_OPTIONS.map((field) => (
                  <div key={field.key}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      {field.label} {field.required && <span style={{ color: 'var(--status-error)' }}>*</span>}
                    </label>
                    <select
                      value={mappings[field.key] || ''}
                      onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
                      style={{
                        width: '100%',
                        marginTop: '0.25rem',
                        padding: '0.5rem',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <option value="">-- Ignore Field --</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample Data Table Preview */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Live Data Preview (First 3 Rows)
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Website</th>
                        <th>Phone</th>
                        <th>City</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 3).map((r, idx) => (
                        <tr key={idx}>
                          <td>{r[mappings.companyName] || '—'}</td>
                          <td>{r[mappings.website] || '—'}</td>
                          <td>{r[mappings.phone] || '—'}</td>
                          <td>{r[mappings.city] || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleExcelImport}
                disabled={importing}
                className="btn btn-brand"
                style={{ width: '100%', height: '42px' }}
              >
                {importing ? 'Processing & Deduplicating...' : `🚀 Ingest & Process ${rawRows.length} Leads`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Paste CSV */}
      {activeTab === 'paste' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Paste Raw CSV Content
          </h3>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder={`Company,Website,Phone,Email,City,State\nAcme Corp,https://acme.com,+91 9876543210,contact@acme.com,Mumbai,Maharashtra`}
            rows={10}
            style={{
              width: '100%',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              marginBottom: '1rem',
            }}
          />
          <button
            onClick={async () => {
              if (!csvContent.trim()) return;
              setImporting(true);
              setError(null);
              try {
                const res = await fetch('/api/leads/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ source: 'csv', csvContent }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Import failed');
                setResult(data);
              } catch (err: any) {
                setError(err.message);
              } finally {
                setImporting(false);
              }
            }}
            disabled={importing || !csvContent.trim()}
            className="btn btn-brand"
            style={{ height: '42px' }}
          >
            {importing ? 'Ingesting...' : 'Ingest Pasted CSV Leads'}
          </button>
        </div>
      )}

      {/* Tab 3: Google Maps Search */}
      {activeTab === 'gmaps' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            📍 Google Maps Places API Discovery
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Discover local businesses based on industry keyword and target geographic location.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Target Industry / Query
              </label>
              <input
                type="text"
                placeholder="e.g. Dental Clinics, Software Companies"
                style={{
                  width: '100%',
                  marginTop: '0.3rem',
                  padding: '0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Location / City
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai, Maharashtra, India"
                style={{
                  width: '100%',
                  marginTop: '0.3rem',
                  padding: '0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            💡 Tip: Location discovery is integrated into Campaign automation. Creating a campaign automatically triggers location discovery workflows.
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="card" style={{ marginTop: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
          <div style={{ color: 'var(--status-success)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            ✅ Ingestion Complete
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
            <div>Total Parsed: <strong>{result.total}</strong></div>
            <div>Imported Unique: <strong style={{ color: 'var(--status-success)' }}>{result.imported}</strong></div>
            <div>Duplicates Found: <strong>{result.duplicates}</strong></div>
            <div>Errors: <strong>{result.errors}</strong></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card" style={{ marginTop: '1.5rem', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ color: 'var(--status-error)', fontWeight: 600, fontSize: '0.9rem' }}>
            ❌ {error}
          </div>
        </div>
      )}
    </div>
  );
}
