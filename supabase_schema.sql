-- ============================================================================
-- SkillPath - Complete PostgreSQL Database Schema & Migration
-- Central Admin Architecture with Row Level Security (RLS)
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gixtsahnwyckrdsxgbdn/sql/new
-- ============================================================================

-- Enable pgcrypto extension for UUID generation and hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE & ROLE SECURITY
-- Linked directly to Supabase Auth users with role check ('user' or 'admin')
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure all columns exist even if profiles table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- Enforce role check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check' AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- Helper function: Check if current authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = (select auth.uid())),
    false
  );
$$;

-- Trigger Function: Prevent non-admins from escalating or modifying roles
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Access denied: Only administrators can modify user roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- ----------------------------------------------------------------------------
-- 2. SECURE ADMIN FUNCTION: SET USER ROLE
-- Only admins can promote or demote users; prevents demoting the last admin.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_is_admin BOOLEAN;
    target_current_role TEXT;
    admin_count INT;
BEGIN
    caller_is_admin := public.is_admin();
    IF NOT caller_is_admin THEN
        RAISE EXCEPTION 'Access denied: Only administrators can modify user roles.';
    END IF;

    IF new_role NOT IN ('user', 'admin') THEN
        RAISE EXCEPTION 'Invalid role specified: %', new_role;
    END IF;

    SELECT role INTO target_current_role FROM public.profiles WHERE id = target_user_id;
    IF target_current_role IS NULL THEN
        RAISE EXCEPTION 'Target user profile does not exist.';
    END IF;

    -- Safety check: Never demote the last remaining administrator
    IF target_current_role = 'admin' AND new_role = 'user' THEN
        SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
        IF admin_count <= 1 THEN
            RAISE EXCEPTION 'Action blocked: Cannot demote the last remaining administrator.';
        END IF;
    END IF;

    UPDATE public.profiles
    SET role = new_role
    WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'new_role', new_role
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. DOMAINS TABLE
-- Global curriculums (created by admin) and personal user roadmaps
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Untitled Roadmap',
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#6366f1',
    position INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safely add missing columns
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Untitled Roadmap';
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🎯';
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backwards compatibility with legacy columns 'name' and 'user_id'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'domains' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.domains ALTER COLUMN user_id DROP NOT NULL;
        UPDATE public.domains SET created_by = user_id WHERE created_by IS NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'domains' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.domains ALTER COLUMN name DROP NOT NULL;
        UPDATE public.domains SET title = name WHERE title IS NULL;
    END IF;
END $$;

UPDATE public.domains SET title = 'Untitled Roadmap' WHERE title IS NULL;
ALTER TABLE public.domains ALTER COLUMN title SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. TASKS TABLE
-- Tasks and learning milestones under each domain
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    resource_url TEXT DEFAULT '',
    estimated_hours NUMERIC DEFAULT 1,
    level TEXT DEFAULT 'Beginner',
    position INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS resource_url TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Beginner';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position INT DEFAULT 0 NOT NULL;

-- Enforce task level check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_level_check' AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_level_check CHECK (level IN ('Beginner', 'Intermediate', 'Advanced'));
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. USER_PROGRESS TABLE
-- Tracks individual completion status of tasks per student
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, task_id)
);

ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- ----------------------------------------------------------------------------
-- 6. PLANNER TEMPLATES (Admin-curated Official Study Plans)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planner_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.planner_templates ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.planner_templates ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.planner_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.planner_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique partial index ensuring only ONE template can have is_default = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_templates_single_default 
    ON public.planner_templates (is_default) 
    WHERE is_default = true;

-- Helper function: Set active default planner template safely
CREATE OR REPLACE FUNCTION public.set_default_planner_template(target_template_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Only administrators can set the default template.';
    END IF;

    UPDATE public.planner_templates SET is_default = false WHERE is_default = true;
    UPDATE public.planner_templates SET is_default = true WHERE id = target_template_id;
    RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. PLANNER SLOTS (Curated Schedule Slots Under a Template)
-- day_of_week: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planner_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.planner_templates(id) ON DELETE CASCADE NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    title TEXT NOT NULL,
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.planner_templates(id) ON DELETE CASCADE;
ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS day_of_week INT;
ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL;
ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.planner_slots ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- ----------------------------------------------------------------------------
-- 8. USER_PLANNER_PROGRESS (Completion tracking of Official Slots per user)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_planner_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    slot_id UUID REFERENCES public.planner_slots(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, slot_id)
);

-- ----------------------------------------------------------------------------
-- 9. USER_PLANNER_ENTRIES (Personal slots created by individual students)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_planner_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 10. RESOURCES TABLE (Global & Personal Bookmarks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    domain TEXT DEFAULT 'General',
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    is_global BOOLEAN DEFAULT false NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'General';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 11. ANNOUNCEMENTS TABLE (Platform Banners Created by Admin)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 12. AUTH TRIGGER: AUTO-PROFILE CREATION ON USER SIGNUP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.email, ''),
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE public.profiles.email END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 13. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_domains_created_by ON public.domains(created_by);
CREATE INDEX IF NOT EXISTS idx_domains_global_visible ON public.domains(is_global, is_visible);
CREATE INDEX IF NOT EXISTS idx_domains_position ON public.domains(position);

CREATE INDEX IF NOT EXISTS idx_tasks_domain_id ON public.tasks(domain_id);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(position);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_task_id ON public.user_progress(task_id);

CREATE INDEX IF NOT EXISTS idx_planner_slots_template_day ON public.planner_slots(template_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_planner_slots_domain ON public.planner_slots(domain_id);
CREATE INDEX IF NOT EXISTS idx_planner_slots_task ON public.planner_slots(task_id);

CREATE INDEX IF NOT EXISTS idx_user_planner_progress_user ON public.user_planner_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_planner_entries_user_day ON public.user_planner_entries(user_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_resources_global ON public.resources(is_global);
CREATE INDEX IF NOT EXISTS idx_resources_user ON public.resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_domain ON public.resources(domain_id);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active);

-- ----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_planner_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_planner_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Grant API schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.domains, public.tasks, public.planner_templates, public.planner_slots, public.resources, public.announcements TO anon;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
CREATE POLICY "Profiles select"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update" ON public.profiles;
CREATE POLICY "Profiles update"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
CREATE POLICY "Profiles insert"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = id);

-- DOMAINS POLICIES
DROP POLICY IF EXISTS "Domains select authenticated" ON public.domains;
CREATE POLICY "Domains select authenticated"
    ON public.domains FOR SELECT
    TO authenticated
    USING (
        (is_global = true AND is_visible = true) 
        OR created_by = (select auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Domains select anon" ON public.domains;
CREATE POLICY "Domains select anon"
    ON public.domains FOR SELECT
    TO anon
    USING (is_global = true AND is_visible = true);

DROP POLICY IF EXISTS "Domains insert" ON public.domains;
CREATE POLICY "Domains insert"
    ON public.domains FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR
        (NOT is_global AND created_by = (select auth.uid()))
    );

DROP POLICY IF EXISTS "Domains update" ON public.domains;
CREATE POLICY "Domains update"
    ON public.domains FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR
        (NOT is_global AND created_by = (select auth.uid()))
    )
    WITH CHECK (
        public.is_admin()
        OR
        (NOT is_global AND created_by = (select auth.uid()))
    );

DROP POLICY IF EXISTS "Domains delete" ON public.domains;
CREATE POLICY "Domains delete"
    ON public.domains FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR
        (NOT is_global AND created_by = (select auth.uid()))
    );

-- TASKS POLICIES
DROP POLICY IF EXISTS "Tasks select authenticated" ON public.tasks;
CREATE POLICY "Tasks select authenticated"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND ((d.is_global = true AND d.is_visible = true) OR d.created_by = (select auth.uid()) OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Tasks select anon" ON public.tasks;
CREATE POLICY "Tasks select anon"
    ON public.tasks FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND d.is_global = true AND d.is_visible = true
        )
    );

DROP POLICY IF EXISTS "Tasks insert" ON public.tasks;
CREATE POLICY "Tasks insert"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND NOT d.is_global AND d.created_by = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Tasks update" ON public.tasks;
CREATE POLICY "Tasks update"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND NOT d.is_global AND d.created_by = (select auth.uid())
        )
    )
    WITH CHECK (
        public.is_admin()
        OR
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND NOT d.is_global AND d.created_by = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Tasks delete" ON public.tasks;
CREATE POLICY "Tasks delete"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND NOT d.is_global AND d.created_by = (select auth.uid())
        )
    );

-- USER PROGRESS POLICIES
DROP POLICY IF EXISTS "Progress select" ON public.user_progress;
CREATE POLICY "Progress select"
    ON public.user_progress FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Progress insert" ON public.user_progress;
CREATE POLICY "Progress insert"
    ON public.user_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Progress update" ON public.user_progress;
CREATE POLICY "Progress update"
    ON public.user_progress FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Progress delete" ON public.user_progress;
CREATE POLICY "Progress delete"
    ON public.user_progress FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));

-- PLANNER TEMPLATES POLICIES
DROP POLICY IF EXISTS "Planner templates select authenticated" ON public.planner_templates;
CREATE POLICY "Planner templates select authenticated"
    ON public.planner_templates FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Planner templates select anon" ON public.planner_templates;
CREATE POLICY "Planner templates select anon"
    ON public.planner_templates FOR SELECT
    TO anon
    USING (is_default = true);

DROP POLICY IF EXISTS "Planner templates admin insert" ON public.planner_templates;
CREATE POLICY "Planner templates admin insert"
    ON public.planner_templates FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Planner templates admin update" ON public.planner_templates;
CREATE POLICY "Planner templates admin update"
    ON public.planner_templates FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Planner templates admin delete" ON public.planner_templates;
CREATE POLICY "Planner templates admin delete"
    ON public.planner_templates FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- PLANNER SLOTS POLICIES
DROP POLICY IF EXISTS "Planner slots select authenticated" ON public.planner_slots;
CREATE POLICY "Planner slots select authenticated"
    ON public.planner_slots FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Planner slots select anon" ON public.planner_slots;
CREATE POLICY "Planner slots select anon"
    ON public.planner_slots FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.planner_templates pt
            WHERE pt.id = planner_slots.template_id
            AND pt.is_default = true
        )
    );

DROP POLICY IF EXISTS "Planner slots admin insert" ON public.planner_slots;
CREATE POLICY "Planner slots admin insert"
    ON public.planner_slots FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Planner slots admin update" ON public.planner_slots;
CREATE POLICY "Planner slots admin update"
    ON public.planner_slots FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Planner slots admin delete" ON public.planner_slots;
CREATE POLICY "Planner slots admin delete"
    ON public.planner_slots FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- USER PLANNER PROGRESS POLICIES
DROP POLICY IF EXISTS "User planner progress select" ON public.user_planner_progress;
CREATE POLICY "User planner progress select"
    ON public.user_planner_progress FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "User planner progress insert" ON public.user_planner_progress;
CREATE POLICY "User planner progress insert"
    ON public.user_planner_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User planner progress update" ON public.user_planner_progress;
CREATE POLICY "User planner progress update"
    ON public.user_planner_progress FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User planner progress delete" ON public.user_planner_progress;
CREATE POLICY "User planner progress delete"
    ON public.user_planner_progress FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));

-- USER PLANNER ENTRIES (PERSONAL SLOTS) POLICIES
DROP POLICY IF EXISTS "User planner entries select" ON public.user_planner_entries;
CREATE POLICY "User planner entries select"
    ON public.user_planner_entries FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User planner entries insert" ON public.user_planner_entries;
CREATE POLICY "User planner entries insert"
    ON public.user_planner_entries FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User planner entries update" ON public.user_planner_entries;
CREATE POLICY "User planner entries update"
    ON public.user_planner_entries FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User planner entries delete" ON public.user_planner_entries;
CREATE POLICY "User planner entries delete"
    ON public.user_planner_entries FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));

-- RESOURCES POLICIES
DROP POLICY IF EXISTS "Resources select authenticated" ON public.resources;
CREATE POLICY "Resources select authenticated"
    ON public.resources FOR SELECT
    TO authenticated
    USING (
        is_global = true 
        OR user_id = (select auth.uid()) 
        OR created_by = (select auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Resources select anon" ON public.resources;
CREATE POLICY "Resources select anon"
    ON public.resources FOR SELECT
    TO anon
    USING (is_global = true);

DROP POLICY IF EXISTS "Resources insert" ON public.resources;
CREATE POLICY "Resources insert"
    ON public.resources FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR
        (NOT is_global AND user_id = (select auth.uid()))
    );

DROP POLICY IF EXISTS "Resources update" ON public.resources;
CREATE POLICY "Resources update"
    ON public.resources FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR
        (NOT is_global AND (user_id = (select auth.uid()) OR created_by = (select auth.uid())))
    )
    WITH CHECK (
        public.is_admin()
        OR
        (NOT is_global AND (user_id = (select auth.uid()) OR created_by = (select auth.uid())))
    );

DROP POLICY IF EXISTS "Resources delete" ON public.resources;
CREATE POLICY "Resources delete"
    ON public.resources FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR
        (NOT is_global AND (user_id = (select auth.uid()) OR created_by = (select auth.uid())))
    );

-- ANNOUNCEMENTS POLICIES
DROP POLICY IF EXISTS "Announcements select authenticated" ON public.announcements;
CREATE POLICY "Announcements select authenticated"
    ON public.announcements FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Announcements select anon" ON public.announcements;
CREATE POLICY "Announcements select anon"
    ON public.announcements FOR SELECT
    TO anon
    USING (is_active = true);

DROP POLICY IF EXISTS "Announcements admin insert" ON public.announcements;
CREATE POLICY "Announcements admin insert"
    ON public.announcements FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Announcements admin update" ON public.announcements;
CREATE POLICY "Announcements admin update"
    ON public.announcements FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Announcements admin delete" ON public.announcements;
CREATE POLICY "Announcements admin delete"
    ON public.announcements FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 15. SEED CURRICULUM, DEFAULT PLANNER & RESOURCES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    ai_id UUID := 'a1000000-0000-0000-0000-000000000001'::uuid;
    fs_id UUID := 'b1000000-0000-0000-0000-000000000002'::uuid;
    cs_id UUID := 'c1000000-0000-0000-0000-000000000003'::uuid;
    do_id UUID := 'd1000000-0000-0000-0000-000000000004'::uuid;
    tmpl_id UUID := 'e1000000-0000-0000-0000-000000000005'::uuid;
    t_ai_1 UUID := 'f1000000-0000-0000-0000-000000000001'::uuid;
    t_fs_1 UUID := 'f1000000-0000-0000-0000-000000000002'::uuid;
BEGIN
    -- Global Domains
    IF NOT EXISTS (SELECT 1 FROM public.domains WHERE is_global = true) THEN
        INSERT INTO public.domains (id, title, description, icon, color, position, is_visible, is_global)
        VALUES 
        (ai_id, 'AI & Machine Learning Engineering', 'Master LLMs, PyTorch, LangChain, RAG architectures, and AI model deployment.', '🤖', '#8b5cf6', 1, true, true),
        (fs_id, 'Full Stack Web Development', 'Comprehensive modern web development from UI design to scalable cloud backends.', '💻', '#06b6d4', 2, true, true),
        (cs_id, 'Cybersecurity & Defense', 'Network protocols, penetration testing, defensive engineering, and OWASP Top 10.', '🛡️', '#10b981', 3, true, true),
        (do_id, 'DevOps & Cloud Engineering', 'Docker containerization, CI/CD automation, Kubernetes, and infrastructure as code.', '🚀', '#f59e0b', 4, true, true);

        -- AI Tasks
        INSERT INTO public.tasks (id, domain_id, title, description, resource_url, estimated_hours, level, position) VALUES
        (t_ai_1, ai_id, 'Python for AI & Numerical Computing', 'NumPy, Pandas, Vectorization and Matrix math fundamentals', 'https://numpy.org/doc/stable/', 12, 'Beginner', 1),
        (gen_random_uuid(), ai_id, 'Deep Learning Foundations with PyTorch', 'Tensors, Autograd, Neural network building blocks and training loops', 'https://pytorch.org/tutorials/', 20, 'Intermediate', 2),
        (gen_random_uuid(), ai_id, 'Large Language Models (LLMs) & Prompt Engineering', 'Context windows, tokens, temperature, and few-shot prompting techniques', 'https://platform.openai.com/docs/guides/prompt-engineering', 15, 'Intermediate', 3),
        (gen_random_uuid(), ai_id, 'Retrieval-Augmented Generation (RAG)', 'Vector databases, embeddings (pgvector, Pinecone), and document chunking', 'https://supabase.com/docs/guides/ai', 18, 'Advanced', 4),
        (gen_random_uuid(), ai_id, 'AI Agent Frameworks & Production Microservices', 'Building autonomous agents with LangGraph, CrewAI, and FastAPI microservices', 'https://fastapi.tiangolo.com/', 25, 'Advanced', 5);

        -- Full Stack Tasks
        INSERT INTO public.tasks (id, domain_id, title, description, resource_url, estimated_hours, level, position) VALUES
        (t_fs_1, fs_id, 'HTML5 Semantic Markup & Modern CSS3', 'Flexbox, CSS Grid, custom properties, and responsive design systems', 'https://developer.mozilla.org/en-US/docs/Web/CSS', 10, 'Beginner', 1),
        (gen_random_uuid(), fs_id, 'Modern JavaScript (ES6+) & DOM Engine', 'Async/await, Promises, closures, modules, and API fetch patterns', 'https://javascript.info/', 15, 'Beginner', 2),
        (gen_random_uuid(), fs_id, 'Relational Databases & SQL Mastery', 'PostgreSQL schema modeling, indexes, foreign keys, and RLS security', 'https://www.postgresql.org/docs/', 18, 'Intermediate', 3),
        (gen_random_uuid(), fs_id, 'RESTful APIs & Backend Architecture', 'Node.js/Express or Python, routing, authentication, and JWT authorization', 'https://expressjs.com/', 20, 'Intermediate', 4),
        (gen_random_uuid(), fs_id, 'Frontend Frameworks & State Management', 'Component lifecycles, reactivity, build tools, and web optimization', 'https://react.dev/', 24, 'Advanced', 5);

        -- Cybersecurity Tasks
        INSERT INTO public.tasks (id, domain_id, title, description, resource_url, estimated_hours, level, position) VALUES
        (gen_random_uuid(), cs_id, 'Computer Networking & Protocols', 'TCP/IP, OSI layers, DNS, subnetting, Wireshark packet capture analysis', 'https://www.wireshark.org/docs/', 14, 'Beginner', 1),
        (gen_random_uuid(), cs_id, 'Linux Systems & Command Line Hardening', 'Permissions, file hierarchies, bash automation, and SSH hardening', 'https://linuxjourney.com/', 16, 'Beginner', 2),
        (gen_random_uuid(), cs_id, 'OWASP Top 10 Web Vulnerabilities', 'XSS, SQL Injection, CSRF, SSRF, and broken access controls remediation', 'https://owasp.org/www-project-top-ten/', 18, 'Intermediate', 3),
        (gen_random_uuid(), cs_id, 'Applied Cryptography & PKI', 'Symmetric/Asymmetric encryption, TLS/SSL certificates, hashing, and salt', 'https://cryptopals.com/', 20, 'Advanced', 4);

        -- DevOps Tasks
        INSERT INTO public.tasks (id, domain_id, title, description, resource_url, estimated_hours, level, position) VALUES
        (gen_random_uuid(), do_id, 'Docker Containerization Fundamentals', 'Dockerfiles, multi-stage builds, volume mounts, and Docker Compose networks', 'https://docs.docker.com/', 12, 'Beginner', 1),
        (gen_random_uuid(), do_id, 'CI/CD Pipeline Automation', 'GitHub Actions workflows, automated testing, artifact caching, and releases', 'https://docs.github.com/en/actions', 15, 'Intermediate', 2),
        (gen_random_uuid(), do_id, 'Cloud Fundamentals (AWS / GCP / Cloudflare)', 'Object storage, VPC networking, serverless compute, and DNS routing', 'https://aws.amazon.com/free/', 18, 'Intermediate', 3),
        (gen_random_uuid(), do_id, 'Kubernetes Container Orchestration', 'Pods, Deployments, Services, ConfigMaps, and cluster autoscaling', 'https://kubernetes.io/docs/home/', 25, 'Advanced', 4);
    END IF;

    -- Default Planner Template
    IF NOT EXISTS (SELECT 1 FROM public.planner_templates WHERE is_default = true) THEN
        INSERT INTO public.planner_templates (id, title, description, is_default)
        VALUES (tmpl_id, '12-Week Official IT Foundations & Project Plan', 'Standard recommended curriculum study cadence designed by SkillPath faculty.', true);

        -- Mon (0) to Sun (6) Slots
        INSERT INTO public.planner_slots (template_id, day_of_week, start_time, end_time, title, domain_id, task_id, notes) VALUES
        (tmpl_id, 0, '09:00:00', '11:00:00', 'Python & Math Numerical Foundations', ai_id, t_ai_1, 'Focus on NumPy array broadcasting and vector operations.'),
        (tmpl_id, 0, '14:00:00', '16:00:00', 'HTML5 Semantic Layouts & Flexbox', fs_id, t_fs_1, 'Build responsive layout wireframes without third-party libraries.'),
        (tmpl_id, 1, '10:00:00', '12:30:00', 'Data Structures & Algorithmic Problem Solving', fs_id, NULL, 'Solve 3 medium LeetCode problems on array hashing.'),
        (tmpl_id, 2, '09:30:00', '11:30:00', 'Database Schema Design & PostgreSQL Indexes', fs_id, NULL, 'Model relational tables and review execution plans with EXPLAIN ANALYZE.'),
        (tmpl_id, 3, '14:00:00', '16:30:00', 'Docker Containerization & Multi-stage Builds', do_id, NULL, 'Containerize Node.js service with production optimization.'),
        (tmpl_id, 4, '10:00:00', '12:00:00', 'Applied Cryptography & OWASP Remediation', cs_id, NULL, 'Audit API endpoints for broken object level authorization.'),
        (tmpl_id, 5, '11:00:00', '13:00:00', 'Hands-on Mini Project Implementation', fs_id, NULL, 'Integrate client authentication and test error states.'),
        (tmpl_id, 6, '15:00:00', '16:30:00', 'Weekly Code Review & Progress Reflection', NULL, NULL, 'Review weekly goals, check off completed milestones, plan week ahead.');
    END IF;

    -- Starter Global Resources
    IF NOT EXISTS (SELECT 1 FROM public.resources WHERE is_global = true) THEN
        INSERT INTO public.resources (title, url, category, domain, is_global, notes) VALUES
        ('MDN Web Docs - HTML & CSS', 'https://developer.mozilla.org', 'Documentation', 'Full Stack Development', true, 'The definitive reference guide for web standard APIs.'),
        ('PostgreSQL Official Documentation', 'https://www.postgresql.org/docs/', 'Documentation', 'Database', true, 'Core documentation for schema design, constraints, and indexes.'),
        ('PyTorch Deep Learning Tutorials', 'https://pytorch.org/tutorials/', 'Tutorial', 'AI Engineering', true, 'Hands-on step-by-step deep learning tutorials and training loops.'),
        ('OWASP Top 10 Security Project', 'https://owasp.org/www-project-top-ten/', 'Security Guide', 'Cybersecurity', true, 'Comprehensive reference on the most critical web security vulnerabilities.'),
        ('Docker Docs - Get Started', 'https://docs.docker.com/get-started/', 'Course', 'DevOps & Cloud', true, 'Foundations of containerization and orchestration.');
    END IF;

    -- Starter Announcement
    IF NOT EXISTS (SELECT 1 FROM public.announcements WHERE is_active = true) THEN
        INSERT INTO public.announcements (message, is_active)
        VALUES ('🚀 Welcome to SkillPath! Explore the curated roadmaps and follow the Official Weekly Study Plan.', true);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 16. ADMIN USER ACTIVATION SNIPPET
-- Admin Email: pravinthn008@gmail.com
-- Admin Password: admin@123
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    admin_uid UUID;
BEGIN
    SELECT id INTO admin_uid FROM auth.users WHERE email = 'pravinthn008@gmail.com' LIMIT 1;

    IF admin_uid IS NOT NULL THEN
        -- Confirm email and update password
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            encrypted_password = crypt('admin@123', gen_salt('bf'))
        WHERE id = admin_uid;

        -- Guarantee identity row exists for password sign in
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = admin_uid) THEN
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
            ) VALUES (
                admin_uid, admin_uid, format('{"sub":"%s","email":"%s"}', admin_uid::text, 'pravinthn008@gmail.com')::jsonb,
                'email', admin_uid::text, NOW(), NOW(), NOW()
            );
        END IF;

        -- Temporarily lift prevent_role_change trigger for setup
        DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;

        INSERT INTO public.profiles (id, full_name, email, role)
        VALUES (admin_uid, 'Pravinth (Admin)', 'pravinthn008@gmail.com', 'admin')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin',
            email = 'pravinthn008@gmail.com',
            full_name = COALESCE(NULLIF(public.profiles.full_name, ''), 'Pravinth (Admin)');

        -- Restore role-change protection trigger
        CREATE TRIGGER trg_prevent_role_change
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();
    END IF;
END $$;
