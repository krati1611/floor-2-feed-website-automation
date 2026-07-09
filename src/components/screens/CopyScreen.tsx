"use client";

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Loader2 } from 'lucide-react';

export default function CopyScreen() {
  const { project, updateCopy, setStep } = useProjectStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCopy = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      
      if (!res.ok) throw new Error('Failed to generate copy');
      
      const data = await res.json();
      updateCopy(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Automatically generate if copy is empty and not already generating
    if (!project.copy.website && !isGenerating && !error) {
      generateCopy();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = () => {
    setStep('images');
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Project Copy</h2>
        <button onClick={generateCopy} className="btn-secondary" disabled={isGenerating} style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
          {isGenerating ? 'Generating...' : 'Regenerate All'}
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Review and edit the AI-generated copy. This will be used across the website, deck, and video.</p>
      
      {isGenerating ? (
        <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={40} style={{ animation: 'spin 2s linear infinite', color: 'var(--accent-primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Claude is crafting your copy from the project facts...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '20px', backgroundColor: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: '#ff6b6b' }}>Error: {error}</p>
          <button onClick={generateCopy} className="btn-secondary" style={{ marginTop: '12px' }}>Try Again</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label className="label">Website Landing Page Copy</label>
            <textarea 
              className="input-field" 
              rows={4}
              value={project.copy.website || ''}
              onChange={(e) => updateCopy({ website: e.target.value })}
            />
          </div>
          <div>
            <label className="label">SEO Meta Description</label>
            <input 
              type="text"
              className="input-field" 
              value={project.copy.seo_meta || ''}
              onChange={(e) => updateCopy({ seo_meta: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Pitch Deck Narrative</label>
            <textarea 
              className="input-field" 
              rows={3}
              value={project.copy.deck || ''}
              onChange={(e) => updateCopy({ deck: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Video Script</label>
            <textarea 
              className="input-field" 
              rows={6}
              value={project.copy.video_script || ''}
              onChange={(e) => updateCopy({ video_script: e.target.value })}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
        <button type="button" className="btn-secondary" onClick={() => setStep('intake')}>
          &larr; Back to Intake
        </button>
        <button type="button" className="btn-primary" onClick={handleApprove} disabled={isGenerating}>
          Approve & Continue &rarr;
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
