import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FileUp, Download, ShieldCheck, CheckCircle2, FileText, Sun, RefreshCw, AlertCircle } from 'lucide-react';
import './style.css';

function App() {
  const [pdf, setPdf] = useState(null);
  const [busy, setBusy] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function processPdf(e) {
    e.preventDefault(); setError(''); setSuccess('');
    if (!pdf) { setError('Please upload the PDF you want to add the letterhead to.'); return; }
    setBusy(true);
    setElapsedSeconds(0);
    const timer = setInterval(() => setElapsedSeconds(seconds => seconds + 1), 1000);
    try {
      // Verify the built-in letterhead backend is running, rather than an older server.
      const healthResponse = await fetch('/api/health');
      if (!healthResponse.ok) throw new Error('Letterhead server is not responding. Stop old servers and restart this project.');
      const health = await healthResponse.json();
      if (health.appVersion !== 'separate-header-footer-v8' || health.pdfOnlyUpload !== true) {
        throw new Error('An older backend is still running. Stop the old Node.js server, then restart this project from the extracted updated folder.');
      }
      if (!health.headerExists || !health.footerExists) {
        const missing = [];
        if (!health.headerExists) missing.push(`public/header.png is missing or empty (${health.headerBytes || 0} bytes)`);
        if (!health.footerExists) missing.push(`public/footer.png is missing or empty (${health.footerBytes || 0} bytes)`);
        throw new Error(`${missing.join('; ')}. Replace the placeholder files with your actual cropped images, then restart the app.`);
      }
      const form = new FormData(); form.append('pdf', pdf);
      const response = await fetch('/api/replace', { method: 'POST', body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.details ? `${data.error || 'PDF processing failed.'} Details: ${data.details}` : (data.error || 'PDF processing failed.'));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdf.name.replace(/\.pdf$/i, '')}-popular-solar-letterhead.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const pages = response.headers.get('X-PDF-Page-Count');
      setSuccess(`Your PDF is ready${pages ? ` (${pages} pages)` : ''}. Your header and footer have been applied to all pages.`);
    } catch (err) { setError(err.message || 'Something went wrong while processing the PDF.'); }
    finally { clearInterval(timer); setBusy(false); }
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Sun size={24}/></div><div><strong>Popular Solar Solutions</strong><span>Letterhead PDF Studio</span></div></div>
      <div className="privacy"><ShieldCheck size={16}/> Separate header + footer images</div>
    </header>
    <section className="hero">
      <span className="eyebrow">POPULAR SOLAR SOLUTIONS</span>
      <h1>Your letterhead.<br/><em>Every PDF, automatically.</em></h1>
      <p>The header/footer images keep their original proportions and are sized from their crop dimensions. All source PDF pages are preserved.</p>
    </section>
    <section className="panel letterhead-panel">
      <div className="section-heading"><span className="step">01</span><div><h2>Header and footer images</h2><p>Use your own cropped images named header.png and footer.png inside the public folder.</p></div></div>
      <div className="letterhead-preview"><div className="image-pair-preview">
        <div><strong>Header</strong><img src="/header.png" alt="Header preview" onError={e => { e.currentTarget.style.display='none'; }} /></div>
        <div><strong>Footer</strong><img src="/footer.png" alt="Footer preview" onError={e => { e.currentTarget.style.display='none'; }} /></div>
      </div></div>
      <div className="fixed-note"><CheckCircle2 size={17}/><span>Save your cropped images as public/header.png and public/footer.png. They are reused automatically.</span></div>
    </section>
    <form className="panel upload-panel" onSubmit={processPdf}>
      <div className="section-heading"><span className="step">02</span><div><h2>Upload your PDF</h2><p>Only the PDF is needed. Your saved header and footer images are applied automatically.</p></div></div>
      <label className="file-picker">
        <input type="file" accept="application/pdf,.pdf" onChange={e => { setPdf(e.target.files?.[0] || null); setError(''); setSuccess(''); }} />
        <span className="picker-icon"><FileUp size={24}/></span>
        <span className="picker-label">Choose PDF document</span>
        <span className="picker-name">{pdf ? `${pdf.name} · ${(pdf.size / (1024 * 1024)).toFixed(2)} MB` : 'Select a PDF file (maximum 30 MB)'}</span>
        <span className="picker-action">Browse files</span>
      </label>
      <div className="hint-box"><FileText size={17}/><span>All PDF pages are retained. Header/footer images keep their proportions and are capped at 16% of page height.</span></div>
      <div className="page-actions">
        <button type="button" className="secondary-btn" onClick={() => { setPdf(null); setError(''); setSuccess(''); }}><RefreshCw size={16}/> Clear PDF</button>
        <button type="submit" className="primary-btn" disabled={busy}>{busy ? <><span className="spinner"/> Processing… {elapsedSeconds}s</> : <><Download size={18}/> Apply letterhead & download</>}</button>
      </div>
    </form>
    {error && <div className="notice error"><AlertCircle size={18}/>{error}</div>}
    {success && <div className="notice success"><CheckCircle2 size={18}/>{success}</div>}
    <footer className="footer"><span>Popular Solar Solutions · PDF Letterhead Studio</span><span>Fixed design · PDF-only upload</span></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
