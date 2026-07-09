"use client";

import { useState } from 'react';
import { useProjectStore, Asset } from '@/store/useProjectStore';
import { useJobPolling } from '@/hooks/useJobPolling';

export default function ImagesScreen() {
  const { project, setStep, addAsset } = useProjectStore();
  const [prompt, setPrompt] = useState('A beautiful modern living room with large windows, north-facing sunlight, oak floors, and minimalist furniture.');
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  
  const { status, progress, error, result, startJob, reset } = useJobPolling<{ variants: string[] }>();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    // We clear previously selected variants on new generation
    setSelectedVariants([]);
    
    startJob(
      async () => {
        const res = await fetch('/api/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, projectId: project.project_id }),
        });
        if (!res.ok) throw new Error('Failed to submit job');
        const data = await res.json();
        return data.job_id;
      },
      async (jobId) => {
        const res = await fetch(`/api/generate-images/status?job_id=${jobId}`);
        if (!res.ok) throw new Error('Failed to poll status');
        return await res.json();
      },
      { intervalMs: 1500 }
    );
  };

  const toggleVariantSelection = (url: string) => {
    setSelectedVariants(prev => 
      prev.includes(url) ? prev.filter(v => v !== url) : [...prev, url]
    );
  };

  const handleApprove = () => {
    // Add selected variants as assets to the project
    selectedVariants.forEach((url, index) => {
      const asset: Asset = {
        asset_id: `asset_${Date.now()}_${index}`,
        project_id: project.project_id,
        track: 'image',
        status: 'approved',
        url,
        prompt,
        variant_index: index,
      };
      addAsset(asset);
    });
    
    setStep('3d');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>Image Generation</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
          Define the styling and room details. The system will generate multiple variants for you to pick from.
        </p>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Shot Prompt (Interior)</label>
          <textarea 
            className="input-field" 
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={status === 'polling' || status === 'submitting'}
          />
        </div>

        {status === 'idle' && (
          <button className="btn-primary" onClick={handleGenerate}>
            Generate Images
          </button>
        )}

        {(status === 'submitting' || status === 'polling') && (
          <div style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '500' }}>Generating Variants...</span>
              <span style={{ color: 'var(--primary)' }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${progress}%`, 
                  height: '100%', 
                  background: 'var(--primary)', 
                  transition: 'width 0.5s ease' 
                }} 
              />
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '14px' }}>
              Engine is rendering multiple perspectives. This may take a few moments.
            </p>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginTop: '16px' }}>
            {error}
            <div style={{ marginTop: '12px' }}>
              <button className="btn-secondary" onClick={reset}>Try Again</button>
            </div>
          </div>
        )}
      </div>

      {status === 'done' && result?.variants && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px' }}>Gallery — Pick the best shots</h3>
            {selectedVariants.length > 0 && (
              <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
                {selectedVariants.length} selected
              </span>
            )}
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {result.variants.map((url, i) => {
              const isSelected = selectedVariants.includes(url);
              return (
                <div 
                  key={i}
                  onClick={() => toggleVariantSelection(url)}
                  style={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 0 4px rgba(99, 102, 241, 0.2)' : 'none'
                  }}
                >
                  <img 
                    src={url} 
                    alt={`Generated variant ${i+1}`} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: isSelected ? 1 : 0.85,
                    }}
                  />
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'var(--primary)',
                      color: 'white',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '32px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={handleGenerate}>
              Reroll All
            </button>
            <button 
              className="btn-primary" 
              onClick={handleApprove}
              disabled={selectedVariants.length === 0}
              style={{ opacity: selectedVariants.length === 0 ? 0.5 : 1 }}
            >
              Approve & Continue to 3D
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
