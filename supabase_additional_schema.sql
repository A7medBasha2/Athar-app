-- ==============================================================================
-- ATHAR (أثر) — SUPABASE ADDITIONAL DATABASE SCHEMA & EXTENSIONS
-- ==============================================================================
-- This script contains all supplementary tables, indexes, security policies (RLS),
-- triggers, and storage bucket definitions required to completely replace Firebase.
-- Run this in the Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 0. Ensure UUID extension is active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. COMMUNITY GROUPS & CIRCLES (حلقات ومجموعات أثر)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('quran', 'dhikr', 'knowledge', 'charity', 'general', 'tadabbur', 'hifz', 'youth')),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL DEFAULT 'عضو في أثر',
  creator_photo TEXT DEFAULT '',
  members_count INTEGER NOT NULL DEFAULT 1,
  posts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_category ON public.groups(category);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON public.groups(creator_id);

-- ==============================================================================
-- 2. GROUP MEMBERSHIPS (عضويات الحلقات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_group_user UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(status);

-- ==============================================================================
-- 3. GROUP POSTS (منشورات وتدبرات الحلقات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'عضو في أثر',
  author_photo TEXT DEFAULT '',
  author_level INTEGER DEFAULT 1,
  content TEXT NOT NULL,
  media_url TEXT DEFAULT '',
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reactions_count JSONB DEFAULT '{"jazakallah": 0, "barakallah": 0, "ameen": 0}'::jsonb,
  user_reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON public.group_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_user_id ON public.group_posts(user_id);

-- ==============================================================================
-- 4. GROUP COMMENTS (تعليقات منشورات الحلقات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.group_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'عضو في أثر',
  author_photo TEXT DEFAULT '',
  author_level INTEGER DEFAULT 1,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_comments_post_id ON public.group_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_group_comments_group_id ON public.group_comments(group_id);

-- ==============================================================================
-- 5. COMMUNITY MODERATION REPORTS (بلاغات المحتوى والمشرفين)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'group_post', 'group_comment')),
  target_id TEXT NOT NULL,
  post_id TEXT,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'offensive', 'spam', 'other')),
  details TEXT DEFAULT '',
  snippet TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);

-- ==============================================================================
-- 6. GLOBAL & SECTION SYSTEM NOTICES (الإعلانات والتنبيهات العامة)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT '',
  message TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'app_wide' CHECK (scope IN ('app_wide', 'gamaa', 'section')),
  target_section TEXT DEFAULT '',
  target_campaign_id TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'scheduled', 'active', 'archived')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_notices_status ON public.system_notices(status, is_pinned DESC, created_at DESC);

-- ==============================================================================
-- 7. USER GAMIFICATION XP LEDGER (سجل نقاط الخبرة والأنشطة الإيمانية)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_xp_ledger (
  id TEXT PRIMARY KEY, -- Unique idempotent event ID (e.g. prayer_fajr_2026-10-23_userId)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  date_key TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_ledger_user ON public.user_xp_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_ledger_date ON public.user_xp_ledger(user_id, date_key);

-- ==============================================================================
-- 8. USER UNLOCKED ACHIEVEMENTS (أوسمة الإنجازات المحققة)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- ==============================================================================
-- 9. STORAGE BUCKET: avatars (سلة التخزين للصور الشخصية)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all newly created tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- GROUPS POLICIES ---
DROP POLICY IF EXISTS "Public can view groups" ON public.groups;
CREATE POLICY "Public can view groups" ON public.groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creator or admin can update group" ON public.groups;
CREATE POLICY "Creator or admin can update group" ON public.groups
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Creator or admin can delete group" ON public.groups;
CREATE POLICY "Creator or admin can delete group" ON public.groups
  FOR DELETE TO authenticated USING (auth.uid() = creator_id OR public.is_admin());

-- --- GROUP MEMBERS POLICIES ---
DROP POLICY IF EXISTS "Public can view group members" ON public.group_members;
CREATE POLICY "Public can view group members" ON public.group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can join groups" ON public.group_members;
CREATE POLICY "Authenticated users can join groups" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can update their own status or group admin" ON public.group_members;
CREATE POLICY "Members can update their own status or group admin" ON public.group_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Members can leave or group admin remove" ON public.group_members;
CREATE POLICY "Members can leave or group admin remove" ON public.group_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- --- GROUP POSTS POLICIES ---
DROP POLICY IF EXISTS "Public can view group posts" ON public.group_posts;
CREATE POLICY "Public can view group posts" ON public.group_posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can create group posts" ON public.group_posts;
CREATE POLICY "Members can create group posts" ON public.group_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members and admins can update reactions on group posts" ON public.group_posts;
CREATE POLICY "Members and admins can update reactions on group posts" ON public.group_posts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authors or admin can delete group posts" ON public.group_posts;
CREATE POLICY "Authors or admin can delete group posts" ON public.group_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- --- GROUP COMMENTS POLICIES ---
DROP POLICY IF EXISTS "Public can view group comments" ON public.group_comments;
CREATE POLICY "Public can view group comments" ON public.group_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can create group comments" ON public.group_comments;
CREATE POLICY "Members can create group comments" ON public.group_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors or admin can delete group comments" ON public.group_comments;
CREATE POLICY "Authors or admin can delete group comments" ON public.group_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- --- REPORTS POLICIES ---
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;
CREATE POLICY "Admins can view reports" ON public.reports
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE TO authenticated USING (public.is_admin());

-- --- SYSTEM NOTICES POLICIES ---
DROP POLICY IF EXISTS "Public can view active notices" ON public.system_notices;
CREATE POLICY "Public can view active notices" ON public.system_notices
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage notices" ON public.system_notices;
CREATE POLICY "Admins can manage notices" ON public.system_notices
  FOR ALL TO authenticated USING (public.is_admin());

-- --- USER XP LEDGER POLICIES ---
DROP POLICY IF EXISTS "Users can view own xp ledger" ON public.user_xp_ledger;
CREATE POLICY "Users can view own xp ledger" ON public.user_xp_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own xp ledger entry" ON public.user_xp_ledger;
CREATE POLICY "Users can insert own xp ledger entry" ON public.user_xp_ledger
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- --- USER ACHIEVEMENTS POLICIES ---
DROP POLICY IF EXISTS "Users can view achievements" ON public.user_achievements;
CREATE POLICY "Users can view achievements" ON public.user_achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own achievement" ON public.user_achievements;
CREATE POLICY "Users can insert own achievement" ON public.user_achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- --- STORAGE AVATARS POLICIES ---
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatar" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==============================================================================
-- 11. REALTIME BROADCAST CHANNELS
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_comments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_notices;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
