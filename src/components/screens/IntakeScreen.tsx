"use client";

import React, { useState, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Upload } from 'lucide-react';

export default function IntakeScreen() {
  const { project, setProjectField, updateFacts, setStep } = useProjectStore();

  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app we'd upload these files, for now we just save their names or objects
    // setProjectField('plans', files.map(f => f.name));
    setStep('copy');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '40px' }}>
      <h2 style={{ marginBottom: '8px', fontSize: '1.5rem' }}>Project Intake</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Upload your plans and provide details to start the engine.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Basic Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label className="label">Developer / Company Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={project.developer}
              onChange={(e) => setProjectField('developer', e.target.value)}
              placeholder="e.g. Acme Properties" 
              required
            />
          </div>
          <div>
            <label className="label">Project Location</label>
            <input 
              type="text" 
              className="input-field" 
              value={project.location}
              onChange={(e) => setProjectField('location', e.target.value)}
              placeholder="e.g. Downtown Seattle, WA" 
              required
            />
          </div>
        </div>

        {/* Project Facts */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Key Facts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
            <div>
              <label className="label">Bedrooms</label>
              <input 
                type="number" 
                className="input-field" 
                value={project.facts.beds || ''}
                onChange={(e) => updateFacts({ beds: parseInt(e.target.value) })}
                placeholder="e.g. 3" 
              />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input 
                type="number" 
                className="input-field" 
                value={project.facts.baths || ''}
                onChange={(e) => updateFacts({ baths: parseFloat(e.target.value) })}
                placeholder="e.g. 2.5" 
              />
            </div>
            <div>
              <label className="label">Orientation</label>
              <input 
                type="text" 
                className="input-field" 
                value={project.facts.orientation || ''}
                onChange={(e) => updateFacts({ orientation: e.target.value })}
                placeholder="e.g. North-facing" 
              />
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <label className="label">Description & Amenities</label>
            <textarea 
              className="input-field" 
              rows={4}
              value={project.facts.description || ''}
              onChange={(e) => updateFacts({ description: e.target.value })}
              placeholder="e.g. Floor-to-ceiling glass, oak floors, warm minimalist style..." 
            />
          </div>
        </div>

        {/* File Dropzone */}
        <div>
          <label className="label">Floor Plans & Related Docs (PDFs, Images)</label>
          <div 
            style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '40px', 
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'rgba(0,0,0,0.2)',
              transition: 'var(--transition-smooth)',
              position: 'relative'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '12px' }} />
            <p style={{ fontWeight: 500, marginBottom: '8px' }}>Drag & drop files here</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>or click to browse</p>
            
            <input 
              type="file" 
              multiple 
              accept="image/*,application/pdf"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
          
          {/* File List */}
          {files.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {files.map((file, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '8px 12px',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{file.type.includes('pdf') ? '📄' : '🖼️'}</span>
                    {file.name}
                  </span>
                  <button 
                    type="button"
                    onClick={() => removeFile(i)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn-primary">
            Start Engine &rarr;
          </button>
        </div>

      </form>
    </div>
  );
}
