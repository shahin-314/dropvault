-- DropVault schema additions.
-- Requires the base public.users and public.files tables.

-- File deduplication
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_files_user_file_hash
ON public.files (user_id, file_hash)
WHERE file_hash IS NOT NULL;

-- Trash support
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_files_user_deleted
ON public.files (user_id, deleted_at);

-- Login tracking
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user
ON public.login_history (user_id, login_at DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user
ON public.password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_expiry
ON public.password_reset_tokens (expires_at);
