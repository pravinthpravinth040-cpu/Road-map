-- ============================================================================
-- SkillPath - Complete Supabase Database Schema & Migration
-- ============================================================================
-- Run this entire script in your Supabase Dashboard:
-- SQL Editor -> New Query -> Paste & Run
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Profiles RLS
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
-- 2. SAVED_DOMAINS TABLE
-- Stores top-level domains created by or saved for each user
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, name)
);

ALTER TABLE public.saved_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own saved domains (select)" ON public.saved_domains;
CREATE POLICY "Users can manage own saved domains (select)"
    ON public.saved_domains FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own saved domains (insert)" ON public.saved_domains;
CREATE POLICY "Users can manage own saved domains (insert)"
    ON public.saved_domains FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own saved domains (update)" ON public.saved_domains;
CREATE POLICY "Users can manage own saved domains (update)"
    ON public.saved_domains FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own saved domains (delete)" ON public.saved_domains;
CREATE POLICY "Users can manage own saved domains (delete)"
    ON public.saved_domains FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_domains_user_id ON public.saved_domains(user_id);

-- ----------------------------------------------------------------------------
-- 3. ROADMAPS TABLE
-- Stores custom roadmaps belonging to users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    domain_id UUID REFERENCES public.saved_domains(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#6366f1',
    local_id TEXT, -- Preserves original localStorage ID for idempotent sync
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can select own roadmaps"
    ON public.roadmaps FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can insert own roadmaps"
    ON public.roadmaps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can update own roadmaps"
    ON public.roadmaps FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own roadmaps" ON public.roadmaps;
CREATE POLICY "Users can delete own roadmaps"
    ON public.roadmaps FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON public.roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_local_id ON public.roadmaps(local_id);

-- ----------------------------------------------------------------------------
-- 4. ROADMAP_STAGES TABLE
-- Stages / milestones within each roadmap
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roadmap_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    roadmap_id UUID REFERENCES public.roadmaps(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    weeks INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0,
    local_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.roadmap_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own roadmap stages" ON public.roadmap_stages;
CREATE POLICY "Users can select own roadmap stages"
    ON public.roadmap_stages FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own roadmap stages" ON public.roadmap_stages;
CREATE POLICY "Users can insert own roadmap stages"
    ON public.roadmap_stages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own roadmap stages" ON public.roadmap_stages;
CREATE POLICY "Users can update own roadmap stages"
    ON public.roadmap_stages FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own roadmap stages" ON public.roadmap_stages;
CREATE POLICY "Users can delete own roadmap stages"
    ON public.roadmap_stages FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_roadmap_stages_roadmap ON public.roadmap_stages(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_stages_user ON public.roadmap_stages(user_id);

-- ----------------------------------------------------------------------------
-- 5. USER_PROGRESS TABLE
-- Topics & mini projects tracked under stages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.roadmap_stages(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('topic', 'project')),
    title TEXT NOT NULL,
    link TEXT DEFAULT '',
    completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    local_id TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own progress items" ON public.user_progress;
CREATE POLICY "Users can select own progress items"
    ON public.user_progress FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress items" ON public.user_progress;
CREATE POLICY "Users can insert own progress items"
    ON public.user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress items" ON public.user_progress;
CREATE POLICY "Users can update own progress items"
    ON public.user_progress FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own progress items" ON public.user_progress;
CREATE POLICY "Users can delete own progress items"
    ON public.user_progress FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_stage ON public.user_progress(stage_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);

-- ----------------------------------------------------------------------------
-- 6. PLANNER_TASKS TABLE
-- Weekly study planner tasks (Mon - Sun)
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
-- 7. BOOKMARKED_RESOURCES TABLE
-- Curated learning bookmarks, courses, and documentation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookmarked_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    domain TEXT DEFAULT 'General',
    notes TEXT DEFAULT '',
    local_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.bookmarked_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own bookmarks" ON public.bookmarked_resources;
CREATE POLICY "Users can select own bookmarks"
    ON public.bookmarked_resources FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarked_resources;
CREATE POLICY "Users can insert own bookmarks"
    ON public.bookmarked_resources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarked_resources;
CREATE POLICY "Users can update own bookmarks"
    ON public.bookmarked_resources FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarked_resources;
CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarked_resources FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarked_resources_user ON public.bookmarked_resources(user_id);

-- ----------------------------------------------------------------------------
-- 8. AUTH TRIGGER: AUTOMATIC PROFILE CREATION ON SIGNUP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Schema definition complete.
