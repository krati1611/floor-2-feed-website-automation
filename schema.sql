-- Supabase (Postgres) Schema for Floor2Feed

-- Projects: The main job tracker
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    location TEXT,
    property_type TEXT,
    status TEXT NOT NULL DEFAULT 'INTAKE', -- INTAKE, STYLE_ANALYSIS, TEMPLATE_SELECTION, GEOMETRY_EXTRACTION, IMAGE_GENERATION, IMAGE_QA, WEBSITE_BUILD, HUMAN_REVIEW, PUBLISH, DONE, FAILED
    template_id UUID,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents: All uploaded files
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL, -- dwg, pdf, image, text
    storage_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Style Briefs: Structured style analysis
CREATE TABLE style_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    brief_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates: Template library
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    best_for TEXT NOT NULL,
    preview_url TEXT,
    nextjs_repo_ref TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms: Extracted room models
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    polygon_json JSONB, -- The 2D geometry
    area_m2 NUMERIC,
    ceiling_height_m NUMERIC,
    openings_json JSONB, -- Doors and windows
    extraction_confidence TEXT, -- auto, needs-review, approximate
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Renders: Generated images
CREATE TABLE renders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    prompt_used TEXT,
    qa_status TEXT DEFAULT 'pending', -- pending, passed, failed
    approved_by_human BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks: The work queue
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent TEXT NOT NULL, -- master, agent_a, agent_b, agent_c
    task_type TEXT NOT NULL,
    status TEXT DEFAULT 'waiting', -- waiting, running, done, failed
    retry_count INTEGER DEFAULT 0,
    payload_json JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Websites: The final output
CREATE TABLE websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    live_url TEXT,
    status TEXT DEFAULT 'building',
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
