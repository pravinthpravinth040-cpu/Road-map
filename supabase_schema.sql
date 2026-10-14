-- ============================================================================
-- SkillPath - Complete PostgreSQL Database Schema with Admin Role & RLS
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gixtsahnwyckrdsxgbdn/sql/new
-- ============================================================================

-- Enable pgcrypto extension for UUID generation and password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE & MIGRATION
-- Linked directly to Supabase Auth users with role check ('user' or 'admin')
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure all columns exist even if profiles table was created in an earlier version
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Ensure role check constraint exists
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
-- Uses SECURITY DEFINER and STABLE to avoid recursive RLS policy lookups
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
-- 2. DOMAINS TABLE & MIGRATION
-- Supports global curriculums (created by admin) and personal user roadmaps
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '🎯',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safely add missing columns if domains table already existed from older schema
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🎯';
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- If old schema used 'name' and 'user_id', migrate their values and drop NOT NULL constraints
DO $$
BEGIN
    -- Drop legacy NOT NULL constraints from older schema so global domains (which have no personal user_id) can be inserted
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

-- Set default fallback title for any blank rows and enforce NOT NULL on title
UPDATE public.domains SET title = 'Untitled Roadmap' WHERE title IS NULL;
ALTER TABLE public.domains ALTER COLUMN title SET NOT NULL;

-- Keep title <-> name and created_by <-> user_id synchronized for backwards compatibility
CREATE OR REPLACE FUNCTION public.sync_domain_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.title IS NULL AND NEW.name IS NOT NULL THEN
        NEW.title := NEW.name;
    ELSIF NEW.name IS NULL AND NEW.title IS NOT NULL THEN
        NEW.name := NEW.title;
    END IF;

    IF NEW.created_by IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.created_by := NEW.user_id;
    ELSIF NEW.user_id IS NULL AND NEW.created_by IS NOT NULL THEN
        NEW.user_id := NEW.created_by;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_domain_fields ON public.domains;
CREATE TRIGGER trg_sync_domain_fields
    BEFORE INSERT OR UPDATE ON public.domains
    FOR EACH ROW EXECUTE FUNCTION public.sync_domain_fields();

-- ----------------------------------------------------------------------------
-- 3. TASKS TABLE
-- Tasks and learning milestones under each domain
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    resource_url TEXT DEFAULT '',
    position INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS resource_url TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position INT DEFAULT 0 NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. USER_PROGRESS TABLE & MIGRATION
-- Tracks individual completion status of tasks per user
-- ----------------------------------------------------------------------------
-- If user_progress exists with an obsolete schema (e.g. stage_id or item_type), drop it to recreate cleanly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND (column_name = 'stage_id' OR column_name = 'item_type')
    ) THEN
        DROP TABLE public.user_progress CASCADE;
    END IF;
END $$;

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
-- 5. PLANNER_TASKS TABLE (Weekly Planner Feature)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planner_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    task_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. RESOURCES TABLE (Bookmarks & Documentation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    domain TEXT DEFAULT 'General',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 7. AUTH TRIGGER: AUTO-PROFILE CREATION ON USER SIGNUP
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
-- 8. INDEXES FOR HIGH QUERY PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_domains_created_by ON public.domains(created_by);
CREATE INDEX IF NOT EXISTS idx_domains_is_global ON public.domains(is_global);
CREATE INDEX IF NOT EXISTS idx_tasks_domain_id ON public.tasks(domain_id);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(position);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_task_id ON public.user_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_day ON public.planner_tasks(user_id, day);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON public.resources(user_id);

-- ----------------------------------------------------------------------------
-- 9. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Grant API schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.domains TO anon;
GRANT SELECT ON public.tasks TO anon;

-- ----------------------------------------------------------------------------
-- 10. RLS POLICIES
-- ----------------------------------------------------------------------------

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users view own profile or admin views all" ON public.profiles;
CREATE POLICY "Users view own profile or admin views all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = id);

-- DOMAINS POLICIES
DROP POLICY IF EXISTS "Select domains" ON public.domains;
CREATE POLICY "Select domains"
    ON public.domains FOR SELECT
    TO authenticated
    USING (is_global = true OR created_by = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Anon select global domains" ON public.domains;
CREATE POLICY "Anon select global domains"
    ON public.domains FOR SELECT
    TO anon
    USING (is_global = true);

DROP POLICY IF EXISTS "Insert domains" ON public.domains;
CREATE POLICY "Insert domains"
    ON public.domains FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_admin())
        OR
        (NOT is_global AND created_by = (select auth.uid()))
    );

DROP POLICY IF EXISTS "Update domains" ON public.domains;
CREATE POLICY "Update domains"
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

DROP POLICY IF EXISTS "Delete domains" ON public.domains;
CREATE POLICY "Delete domains"
    ON public.domains FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR
        (NOT is_global AND created_by = (select auth.uid()))
    );

-- TASKS POLICIES
DROP POLICY IF EXISTS "Select tasks" ON public.tasks;
CREATE POLICY "Select tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND (d.is_global = true OR d.created_by = (select auth.uid()) OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Anon select global tasks" ON public.tasks;
CREATE POLICY "Anon select global tasks"
    ON public.tasks FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND d.is_global = true
        )
    );

DROP POLICY IF EXISTS "Insert tasks" ON public.tasks;
CREATE POLICY "Insert tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND (
                public.is_admin()
                OR
                (NOT d.is_global AND d.created_by = (select auth.uid()))
            )
        )
    );

DROP POLICY IF EXISTS "Update tasks" ON public.tasks;
CREATE POLICY "Update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND (
                public.is_admin()
                OR
                (NOT d.is_global AND d.created_by = (select auth.uid()))
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND (
                public.is_admin()
                OR
                (NOT d.is_global AND d.created_by = (select auth.uid()))
            )
        )
    );

DROP POLICY IF EXISTS "Delete tasks" ON public.tasks;
CREATE POLICY "Delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = tasks.domain_id
            AND (
                public.is_admin()
                OR
                (NOT d.is_global AND d.created_by = (select auth.uid()))
            )
        )
    );

-- USER_PROGRESS POLICIES
DROP POLICY IF EXISTS "Select user progress" ON public.user_progress;
CREATE POLICY "Select user progress"
    ON public.user_progress FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "Insert user progress" ON public.user_progress;
CREATE POLICY "Insert user progress"
    ON public.user_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Update user progress" ON public.user_progress;
CREATE POLICY "Update user progress"
    ON public.user_progress FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Delete user progress" ON public.user_progress;
CREATE POLICY "Delete user progress"
    ON public.user_progress FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));

-- PLANNER_TASKS POLICIES
DROP POLICY IF EXISTS "Users manage own planner tasks" ON public.planner_tasks;
CREATE POLICY "Users manage own planner tasks"
    ON public.planner_tasks FOR ALL
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- RESOURCES POLICIES
DROP POLICY IF EXISTS "Users manage own resources" ON public.resources;
CREATE POLICY "Users manage own resources"
    ON public.resources FOR ALL
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 11. STARTER GLOBAL ROADMAP DATA (Optional Seed)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    ai_id UUID := gen_random_uuid();
    fs_id UUID := gen_random_uuid();
    cs_id UUID := gen_random_uuid();
    do_id UUID := gen_random_uuid();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.domains WHERE is_global = true) THEN
        -- AI Engineering
        INSERT INTO public.domains (id, title, description, icon, is_global)
        VALUES (ai_id, 'AI Engineering', 'Master LLMs, PyTorch, LangChain, RAG architectures, and AI model deployment.', '🤖', true);

        INSERT INTO public.tasks (domain_id, title, description, resource_url, position) VALUES
        (ai_id, 'Python for AI & Numerical Computing', 'NumPy, Pandas, Vectorization and Matrix math fundamentals', 'https://numpy.org/doc/stable/', 1),
        (ai_id, 'Deep Learning Foundations with PyTorch', 'Tensors, Autograd, Neural network building blocks and training loops', 'https://pytorch.org/tutorials/', 2),
        (ai_id, 'Large Language Models (LLMs) & Prompt Engineering', 'Context windows, tokens, temperature, and few-shot prompting techniques', 'https://platform.openai.com/docs/guides/prompt-engineering', 3),
        (ai_id, 'Retrieval-Augated Generation (RAG)', 'Vector databases, embeddings (pgvector, Pinecone), and document chunking', 'https://supabase.com/docs/guides/ai', 4),
        (ai_id, 'AI Agent Frameworks & Production Deployment', 'Building autonomous agents with LangGraph, CrewAI, and FastAPI microservices', 'https://fastapi.tiangolo.com/', 5);

        -- Full Stack Development
        INSERT INTO public.domains (id, title, description, icon, is_global)
        VALUES (fs_id, 'Full Stack Development', 'Comprehensive modern web development from UI design to scalable cloud backends.', '💻', true);

        INSERT INTO public.tasks (domain_id, title, description, resource_url, position) VALUES
        (fs_id, 'HTML5 Semantic Markup & Modern CSS3', 'Flexbox, CSS Grid, custom properties, and responsive design systems', 'https://developer.mozilla.org/en-US/docs/Web/CSS', 1),
        (fs_id, 'Modern JavaScript (ES6+) & DOM Engine', 'Async/await, Promises, closures, modules, and API fetch patterns', 'https://javascript.info/', 2),
        (fs_id, 'Relational Databases & SQL Mastery', 'PostgreSQL schema modeling, indexes, foreign keys, and RLS security', 'https://www.postgresql.org/docs/', 3),
        (fs_id, 'RESTful APIs & Backend Services', 'Node.js/Express or Python, routing, authentication, and JWT authorization', 'https://expressjs.com/', 4),
        (fs_id, 'Frontend Frameworks & State Management', 'Component lifecycles, reactivity, build tools, and web optimization', 'https://react.dev/', 5);

        -- Cybersecurity
        INSERT INTO public.domains (id, title, description, icon, is_global)
        VALUES (cs_id, 'Cybersecurity & Defense', 'Network protocols, penetration testing, defensive engineering, and OWASP Top 10.', '🛡️', true);

        INSERT INTO public.tasks (domain_id, title, description, resource_url, position) VALUES
        (cs_id, 'Computer Networking & Protocols', 'TCP/IP, OSI layers, DNS, subnetting, Wireshark packet capture analysis', 'https://www.wireshark.org/docs/', 1),
        (cs_id, 'Linux Systems & Command Line Hardening', 'Permissions, file hierarchies, bash automation, and SSH hardening', 'https://linuxjourney.com/', 2),
        (cs_id, 'OWASP Top 10 Web Vulnerabilities', 'XSS, SQL Injection, CSRF, SSRF, and broken access controls remediation', 'https://owasp.org/www-project-top-ten/', 3),
        (cs_id, 'Applied Cryptography & PKI', 'Symmetric/Asymmetric encryption, TLS/SSL certificates, hashing, and salt', 'https://cryptopals.com/', 4);

        -- DevOps & Cloud
        INSERT INTO public.domains (id, title, description, icon, is_global)
        VALUES (do_id, 'DevOps & Cloud Engineering', 'Docker containerization, CI/CD automation, Kubernetes, and infrastructure as code.', '🚀', true);

        INSERT INTO public.tasks (domain_id, title, description, resource_url, position) VALUES
        (do_id, 'Docker Containerization', 'Dockerfiles, multi-stage builds, volume mounts, and Docker Compose networks', 'https://docs.docker.com/', 1),
        (do_id, 'CI/CD Pipeline Automation', 'GitHub Actions workflows, automated testing, artifact caching, and releases', 'https://docs.github.com/en/actions', 2),
        (do_id, 'Cloud Fundamentals (AWS / GCP / Cloudflare)', 'Object storage, VPC networking, serverless compute, and DNS routing', 'https://aws.amazon.com/free/', 3),
        (do_id, 'Kubernetes Container Orchestration', 'Pods, Deployments, Services, ConfigMaps, and cluster autoscaling', 'https://kubernetes.io/docs/home/', 4);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 12. SEED DEFAULT ADMINISTRATOR ACCOUNT
-- Admin Email: pravinthn08@gmail.com
-- Admin Password: admin@123
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    admin_uid UUID;
BEGIN
    SELECT id INTO admin_uid FROM auth.users WHERE email = 'pravinthn08@gmail.com';

    IF admin_uid IS NULL THEN
        admin_uid := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            admin_uid,
            'authenticated',
            'authenticated',
            'pravinthn08@gmail.com',
            crypt('admin@123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Pravinth (Admin)"}',
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            encrypted_password = crypt('admin@123', gen_salt('bf'))
        WHERE id = admin_uid;
    END IF;

    -- Guarantee admin profile exists with role = 'admin'
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (admin_uid, 'Pravinth (Admin)', 'pravinthn08@gmail.com', 'admin')
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin',
        email = 'pravinthn08@gmail.com',
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), 'Pravinth (Admin)');
END $$;
