import { create } from 'zustand';

export type Step = 'intake' | 'copy' | 'images' | '3d' | 'video' | 'assemble' | 'export';

export interface ProjectFacts {
  beds?: number;
  baths?: number;
  sqft?: number;
  orientation?: string;
  description?: string;
  [key: string]: any;
}

export interface ProjectBrand {
  palette?: string[];
  type?: any;
  tone?: string;
  logo_url?: string;
}

export interface ProjectCopy {
  website?: string;
  seo_meta?: string;
  deck?: string;
  video_script?: string;
}

export interface Asset {
  asset_id: string;
  project_id: string;
  track: 'image' | 'video' | '3d';
  job_id?: string;
  status: 'pending' | 'generated' | 'approved' | 'rejected' | 'error';
  url?: string;
  prompt?: string;
  variant_index?: number;
}

export interface SceneRoom {
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  floor_texture?: string;
}

export interface SceneWall {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height_m: number;
}

export interface SceneOpening {
  wall: number; // index of wall
  type: string;
  material: string;
}

export interface SceneSpec {
  scene_id: string;
  footprint: { width_m: number; depth_m: number };
  rooms: SceneRoom[];
  walls: SceneWall[];
  openings: SceneOpening[];
  orientation_deg: number;
}

export interface Project {
  project_id: string;
  developer: string;
  location: string;
  facts: ProjectFacts;
  brand: ProjectBrand;
  plans: string[]; // Array of object URLs or base64 strings
  step: Step;
  assets: Asset[];
  copy: ProjectCopy;
  scene_spec?: SceneSpec;
}

interface ProjectState {
  project: Project;
  setProjectField: <K extends keyof Project>(field: K, value: Project[K]) => void;
  updateFacts: (facts: Partial<ProjectFacts>) => void;
  updateCopy: (copy: Partial<ProjectCopy>) => void;
  setStep: (step: Step) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (asset_id: string, updates: Partial<Asset>) => void;
  setSceneSpec: (spec: SceneSpec) => void;
}

// Generate a random ID for this session
const generateId = () => Math.random().toString(36).substring(2, 11);

const initialProject: Project = {
  project_id: generateId(),
  developer: '',
  location: '',
  facts: {},
  brand: {},
  plans: [],
  step: 'intake',
  assets: [],
  copy: {},
};

export const useProjectStore = create<ProjectState>((set) => ({
  project: initialProject,
  setProjectField: (field, value) => 
    set((state) => ({ project: { ...state.project, [field]: value } })),
  updateFacts: (facts) => 
    set((state) => ({ project: { ...state.project, facts: { ...state.project.facts, ...facts } } })),
  updateCopy: (copy) => 
    set((state) => ({ project: { ...state.project, copy: { ...state.project.copy, ...copy } } })),
  setStep: (step) => 
    set((state) => ({ project: { ...state.project, step } })),
  addAsset: (asset) =>
    set((state) => ({ project: { ...state.project, assets: [...state.project.assets, asset] } })),
  updateAsset: (asset_id, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        assets: state.project.assets.map((a) =>
          a.asset_id === asset_id ? { ...a, ...updates } : a
        ),
      },
    })),
  setSceneSpec: (spec) =>
    set((state) => ({ project: { ...state.project, scene_spec: spec } })),
}));
