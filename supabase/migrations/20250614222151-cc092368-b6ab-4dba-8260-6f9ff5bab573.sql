
-- Add alias_name column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN alias_name text;
