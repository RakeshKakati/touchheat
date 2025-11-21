-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  allowed_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Touch events table
CREATE TABLE touch_events (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  viewport_w INTEGER NOT NULL,
  viewport_h INTEGER NOT NULL,
  thumb_zone TEXT NOT NULL CHECK (thumb_zone IN ('left', 'right', 'center', 'unknown')),
  mis_tap BOOLEAN DEFAULT FALSE,
  pressure FLOAT,
  selector TEXT,
  url TEXT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insights table
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_touch_events_project_id ON touch_events(project_id);
CREATE INDEX idx_touch_events_ts ON touch_events(ts);
CREATE INDEX idx_touch_events_url ON touch_events(url);
CREATE INDEX idx_insights_project_id ON insights(project_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_api_key ON projects(api_key);

-- Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE touch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for touch_events
CREATE POLICY "Users can view events for their projects"
  ON touch_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = touch_events.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for insights
CREATE POLICY "Users can view insights for their projects"
  ON insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = insights.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'th_' || encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

