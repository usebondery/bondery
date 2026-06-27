ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS left_swipe_action text NOT NULL DEFAULT 'message'
    CHECK (left_swipe_action IN ('call', 'message', 'email')),
  ADD COLUMN IF NOT EXISTS right_swipe_action text NOT NULL DEFAULT 'call'
    CHECK (right_swipe_action IN ('call', 'message', 'email')),
  ADD COLUMN IF NOT EXISTS group_sort_order text NOT NULL DEFAULT 'count-desc'
    CHECK (group_sort_order IN ('recent-opened', 'count-desc', 'count-asc', 'alpha-asc', 'alpha-desc')),
  ADD COLUMN IF NOT EXISTS tag_sort_order text NOT NULL DEFAULT 'count-desc'
    CHECK (tag_sort_order IN ('count-desc', 'count-asc', 'alpha-asc', 'alpha-desc'));
