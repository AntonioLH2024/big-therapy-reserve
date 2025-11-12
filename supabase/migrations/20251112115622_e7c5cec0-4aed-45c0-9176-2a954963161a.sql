-- Create table to track login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts(email, attempt_time DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own login attempts"
ON public.login_attempts FOR SELECT
USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Service role can manage all login attempts"
ON public.login_attempts FOR ALL
USING (auth.uid() IS NOT NULL);

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts INTEGER;
  last_attempt_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Count failed attempts in the last 15 minutes
  SELECT COUNT(*), MAX(attempt_time)
  INTO failed_attempts, last_attempt_time
  FROM public.login_attempts
  WHERE email = user_email
    AND success = FALSE
    AND attempt_time > NOW() - INTERVAL '15 minutes';
  
  -- Block if 5 or more failed attempts
  IF failed_attempts >= 5 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  user_email TEXT,
  is_success BOOLEAN,
  user_ip TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, ip_address, attempt_time)
  VALUES (user_email, is_success, user_ip, NOW());
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM public.login_attempts
  WHERE attempt_time < NOW() - INTERVAL '24 hours';
  
  -- If successful, clear all failed attempts for this email
  IF is_success THEN
    DELETE FROM public.login_attempts
    WHERE email = user_email AND success = FALSE;
  END IF;
END;
$$;

-- Function to get remaining time until unblock
CREATE OR REPLACE FUNCTION public.get_unblock_time(user_email TEXT)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_failed_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT MAX(attempt_time)
  INTO last_failed_attempt
  FROM public.login_attempts
  WHERE email = user_email
    AND success = FALSE
    AND attempt_time > NOW() - INTERVAL '15 minutes';
  
  IF last_failed_attempt IS NOT NULL THEN
    RETURN last_failed_attempt + INTERVAL '15 minutes';
  END IF;
  
  RETURN NULL;
END;
$$;