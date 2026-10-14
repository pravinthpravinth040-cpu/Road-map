-- ============================================================================
-- SkillPath - Complete Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gixtsahnwyckrdsxgbdn/sql/new
-- ============================================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Linked directly to Supabase Auth users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE   
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. DOMAINS TABLE
-- Custom IT career learning tracks created by users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#6366f1',
    local_id TEXT, -- Preserves localStorage ID for smooth one-time migration
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, name)
);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own domains" ON public.domains;
CREATE POLICY "Users can select own domains"
    ON public.domains FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own domains" ON public.domains;
CREATE POLICY "Users can insert own domains"
    ON public.domains FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own domains" ON public.domains;
CREATE POLICY "Users can update own domains"
    ON public.domains FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own domains" ON public.domains;
CREATE POLICY "Users can delete own domains"
    ON public.domains FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains(user_id);

-- ----------------------------------------------------------------------------
-- 3. STAGES TABLE
-- Curricular milestones / stages under each domain
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    weeks INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0,
    local_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own stages" ON public.stages;
CREATE POLICY "Users can select own stages"
    ON public.stages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stages" ON public.stages;
CREATE POLICY "Users can insert own stages"
    ON public.stages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stages" ON public.stages;
CREATE POLICY "Users can update own stages"
    ON public.stages FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stages" ON public.stages;
CREATE POLICY "Users can delete own stages"
    ON public.stages FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stages_domain_id ON public.stages(domain_id);
CREATE INDEX IF NOT EXISTS idx_stages_user_id ON public.stages(user_id);

-- ----------------------------------------------------------------------------
-- 4. TOPICS TABLE
-- Learning topics and documentation milestones under each stage
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.stages(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    link TEXT DEFAULT '',
    completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    local_id TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own topics" ON public.topics;
CREATE POLICY "Users can select own topics"
    ON public.topics FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own topics" ON public.topics;
CREATE POLICY "Users can insert own topics"
    ON public.topics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own topics" ON public.topics;
CREATE POLICY "Users can update own topics"
    ON public.topics FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own topics" ON public.topics;
CREATE POLICY "Users can delete own topics"
    ON public.topics FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_topics_stage_id ON public.topics(stage_id);
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON public.topics(user_id);

-- ----------------------------------------------------------------------------
-- 5. PROJECTS TABLE
-- Practical mini-projects under each stage
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.stages(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    link TEXT DEFAULT '',
    completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    local_id TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own projects" ON public.projects;
CREATE POLICY "Users can select own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_stage_id ON public.projects(stage_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- ----------------------------------------------------------------------------
-- 6. PLANNER_TASKS TABLE
-- Weekly study planner tasks (Monday - Sunday)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    task_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    local_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own planner tasks" ON public.planner_tasks;
CREATE POLICY "Users can select own planner tasks"
    ON public.planner_tasks FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own planner tasks" ON public.planner_tasks;
CREATE POLICY "Users can insert own planner tasks"
    ON public.planner_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own planner tasks" ON public.planner_tasks;
CREATE POLICY "Users can update own planner tasks"
    ON public.planner_tasks FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own planner tasks" ON public.planner_tasks;
CREATE POLICY "Users can delete own planner tasks"
    ON public.planner_tasks FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_day ON public.planner_tasks(user_id, day);

-- ----------------------------------------------------------------------------
-- 7. RESOURCES TABLE
-- Curated learning bookmarks, courses, and documentation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    domain TEXT DEFAULT 'General',
    notes TEXT DEFAULT '',
    local_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own resources" ON public.resources;
CREATE POLICY "Users can select own resources"
    ON public.resources FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resources" ON public.resources;
CREATE POLICY "Users can insert own resources"
    ON public.resources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resources" ON public.resources;
CREATE POLICY "Users can update own resources"
    ON public.resources FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resources" ON public.resources;
CREATE POLICY "Users can delete own resources"
    ON public.resources FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_resources_user_id ON public.resources(user_id);

-- ----------------------------------------------------------------------------
-- 8. AUTH TRIGGER: AUTO-PROFILE CREATION ON USER SIGNUP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
