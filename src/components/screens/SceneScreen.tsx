"use client";

import { useState, useEffect } from 'react';
import { useProjectStore, SceneSpec } from '@/store/useProjectStore';
import ProceduralScene from '../3d/ProceduralScene';

export default function SceneScreen() {
  const { project, setSceneSpec, setStep } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'editor' | 'preview'>('editor');
  const [localSpec, setLocalSpec] = useState<SceneSpec | null>(project.scene_spec || null);

  useEffect(() => {
    // If we don't have a spec yet, fetch from the Vision API
    if (!project.scene_spec && !localSpec && !loading) {
      generateSpec();
    }
  }, []);

  const generateSpec = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vision-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.project_id }),
      });
      if (!res.ok) throw new Error('Failed to generate Scene Spec');
      const data = await res.json();
      setLocalSpec(data.sceneSpec);
      setSceneSpec(data.sceneSpec);
    } catch (err: any) {
      setError(err.message || 'Error communicating with Vision API');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomDimensionChange = (roomIndex: number, field: 'w' | 'd', value: string) => {
    if (!localSpec) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newSpec = { ...localSpec };
    newSpec.rooms[roomIndex][field] = numValue;

    // We also roughly adjust the walls to match the new room dimension for the mock
    // In a real app, the spec generator or an algorithm would recalculate wall positions
    if (field === 'w') {
      newSpec.walls[2].x1 = -numValue / 2; newSpec.walls[2].x2 = -numValue / 2; // Left
      newSpec.walls[3].x1 = numValue / 2; newSpec.walls[3].x2 = numValue / 2;   // Right
      newSpec.walls[0].x1 = -numValue / 2; newSpec.walls[0].x2 = numValue / 2;  // Back
      newSpec.walls[1].x1 = -numValue / 2; newSpec.walls[1].x2 = numValue / 2;  // Front
    } else if (field === 'd') {
      newSpec.walls[0].z1 = -numValue / 2; newSpec.walls[0].z2 = -numValue / 2; // Back
      newSpec.walls[1].z1 = numValue / 2; newSpec.walls[1].z2 = numValue / 2;   // Front
      newSpec.walls[2].z1 = -numValue / 2; newSpec.walls[2].z2 = numValue / 2;  // Left
      newSpec.walls[3].z1 = -numValue / 2; newSpec.walls[3].z2 = numValue / 2;  // Right
    }

    setLocalSpec(newSpec);
  };

  const handleApproveDimensions = () => {
    if (localSpec) {
      setSceneSpec(localSpec);
      setMode('preview');
    }
  };

  const handleContinue = () => {
    setStep('video'); // proceed to next phase
  };

  if (loading) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Analyzing Floor Plan...</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
          Claude Vision is extracting rooms and walls into a Scene Spec.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '40px' }}>
        <h2 style={{ color: '#ef4444' }}>Vision Extraction Failed</h2>
        <p>{error}</p>
        <button className="btn-secondary" onClick={generateSpec} style={{ marginTop: '16px' }}>Retry</button>
      </div>
    );
  }

  if (!localSpec) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {mode === 'editor' && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>Verify Dimensions</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
            Vision API has extracted approximate dimensions from the uploaded plan. 
            Adjust them here before generating the 3D geometry.
          </p>

          {localSpec.rooms.map((room, i) => (
            <div key={i} style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <h3 style={{ textTransform: 'capitalize', marginBottom: '16px' }}>{room.name} Room</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="label">Width (meters)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="input-field" 
                    value={room.w}
                    onChange={(e) => handleRoomDimensionChange(i, 'w', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Depth (meters)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="input-field" 
                    value={room.d}
                    onChange={(e) => handleRoomDimensionChange(i, 'd', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <button className="btn-primary" onClick={handleApproveDimensions}>
              Generate 3D Scene
            </button>
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', height: '600px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '24px' }}>Live 3D Preview</h2>
            <button className="btn-secondary" onClick={() => setMode('editor')} style={{ padding: '6px 12px', fontSize: '14px' }}>
              Edit Dimensions
            </button>
          </div>
          
          <div style={{ flex: 1, position: 'relative', background: '#111', borderRadius: '12px' }}>
             <ProceduralScene spec={localSpec} assets={project.assets} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button className="btn-primary" onClick={handleContinue}>
              Approve & Continue to Video &rarr;
            </button>
          </div>
        </div>
      )}
      
      {/* Basic inline style for spinner */}
      <style dangerouslySetInnerHTML={{__html: `
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
