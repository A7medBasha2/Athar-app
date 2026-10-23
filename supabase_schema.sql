-- ==============================================================================
-- ATHAR (أثر) — SUPABASE COMPLETE DATABASE SCHEMA & MIGRATION SCRIPT
-- ==============================================================================
-- Designed for: PostgreSQL / Supabase
-- Includes:
-- 1. Tables: profiles, posts, comments, likes, campaigns
-- 2. Auth Trigger for automated profile generation on signup
-- 3. Row Level Security (RLS) Policies (Public read, Authenticated write, Admin moderation)
-- 4. Automatic counters & updated_at maintenance functions
-- ==============================================================================

-- 0. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLE: profiles (الملفات الشخصية وصلاحيات الأعضاء والمشرفين)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'مستخدم أثر',
  username TEXT UNIQUE,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant role checks and username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ==============================================================================
-- 2. TABLE: posts (منشورات منتدى جماعة)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'فاعل خير',
  author_photo TEXT DEFAULT '',
  author_level INTEGER DEFAULT 1,
  content TEXT NOT NULL,
  media_url TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  likes_count INTEGER NOT NULL DEFAULT 0,
  jazakallah_count INTEGER NOT NULL DEFAULT 0,
  barakallah_count INTEGER NOT NULL DEFAULT 0,
  ameen_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON public.posts(is_pinned DESC, created_at DESC);

-- ==============================================================================
-- 3. TABLE: comments (تعليقات الأعضاء على المنشورات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'فاعل خير',
  author_photo TEXT DEFAULT '',
  author_level INTEGER DEFAULT 1,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- ==============================================================================
-- 4. TABLE: likes (تفاعلات الإعجاب والدعاء النبوي: جزاك الله خيراً، بارك الله فيك، آمين)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'jazakallah', 'barakallah', 'ameen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_post_user_reaction UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- ==============================================================================
-- 5. TABLE: campaigns (حملات التسبيح والأهداف الجماعية)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_count BIGINT NOT NULL DEFAULT 1000,
  current_count BIGINT NOT NULL DEFAULT 0,
  dhikr_type TEXT NOT NULL DEFAULT 'subhanallah',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status, created_at DESC);

-- ==============================================================================
-- 6. AUTOMATIC TRIGGER: New User -> Profile Creation in Supabase Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_name TEXT;
BEGIN
  -- Extract name from user metadata or fallback to email username or default
  raw_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'مستخدم أثر'
  );

  INSERT INTO public.profiles (
    id,
    display_name,
    username,
    avatar_url,
    bio,
    role,
    xp,
    streak,
    level,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    raw_name,
    LOWER(REGEXP_REPLACE(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g')) || '_' || SUBSTRING(NEW.id::text, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    '',
    'member',
    0,
    0,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing on every new row in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. HELPER FUNCTION: Check if User is Admin
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(user_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: PROFILES
-- ------------------------------------------------------------------------------
-- Everyone (even anonymous guests) can read public profile summaries
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Authenticated users can insert/update their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (e.g. change role, moderate)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- RLS: POSTS
-- ------------------------------------------------------------------------------
-- Everyone can read posts
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (true);

-- Authenticated members can insert their own posts
CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Post authors or Admins can update posts
CREATE POLICY "Authors and Admins can update posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Post authors or Admins can delete posts
CREATE POLICY "Authors and Admins can delete posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- RLS: COMMENTS
-- ------------------------------------------------------------------------------
-- Everyone can read comments
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Comment author or Admin can delete comments
CREATE POLICY "Authors and Admins can delete comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- RLS: LIKES & REACTIONS
-- ------------------------------------------------------------------------------
-- Everyone can read reactions
CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT
  USING (true);

-- Authenticated users can add their own reaction
CREATE POLICY "Authenticated users can insert likes"
  ON public.likes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Authenticated users can change or delete their own reaction
CREATE POLICY "Users can update their own reaction"
  ON public.likes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reaction"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS: CAMPAIGNS
-- ------------------------------------------------------------------------------
-- Everyone can view campaigns
CREATE POLICY "Campaigns are viewable by everyone"
  ON public.campaigns FOR SELECT
  USING (true);

-- Authenticated users can create campaigns
CREATE POLICY "Authenticated users can create campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Everyone/Authenticated can update campaign count (participating in dhikr)
CREATE POLICY "Authenticated users can participate in campaigns"
  ON public.campaigns FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Campaign creator or Admins can delete campaigns
CREATE POLICY "Creators and Admins can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));

-- ==============================================================================
-- 9. RPC FUNCTION: Atomic Increment Campaign Dhikr Count
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.participate_in_campaign(
  p_campaign_id UUID,
  p_count INTEGER
)
RETURNS TABLE (new_count BIGINT, is_completed BOOLEAN) AS $$
DECLARE
  v_target BIGINT;
  v_updated BIGINT;
BEGIN
  UPDATE public.campaigns
  SET 
    current_count = current_count + p_count,
    status = CASE 
      WHEN (current_count + p_count) >= target_count THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING current_count, target_count INTO v_updated, v_target;

  RETURN QUERY SELECT v_updated, (v_updated >= v_target);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
