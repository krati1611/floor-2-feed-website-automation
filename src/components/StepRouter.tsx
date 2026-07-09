"use client";

import { useProjectStore } from '@/store/useProjectStore';
import IntakeScreen from './screens/IntakeScreen';
import CopyScreen from './screens/CopyScreen';
import ImagesScreen from './screens/ImagesScreen';
import SceneScreen from './screens/SceneScreen';

export default function StepRouter() {
  const { project } = useProjectStore();

  switch (project.step) {
    case 'intake':
      return <IntakeScreen />;
    case 'copy':
      return <CopyScreen />;
    case 'images':
      return <ImagesScreen />;
    case '3d':
      return <SceneScreen />;
    default:
      return (
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
          <h2>{project.step.toUpperCase()} Screen</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "12px" }}>This phase will be built in the next iteration.</p>
        </div>
      );
  }
}
