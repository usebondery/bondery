-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL, -- Call, Coffee, Email, Meal, Meeting, Networking, Note, Other, Party/Social, Text/Messaging, Custom
    description text,
    location text,
    date timestamp with time zone NOT NULL DEFAULT now(),
    attachment_path text, -- Path to file in storage
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Enable RLS for activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policy for activities
CREATE POLICY "Users can view and manage their own activities"
    ON public.activities
    FOR ALL
    USING (auth.uid() = user_id);

-- Create activity_participants table (Many-to-Many relationship with people)
CREATE TABLE IF NOT EXISTS public.activity_participants (
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (activity_id, person_id)
);

-- Enable RLS for participants
ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

-- Create policy for activity_participants
-- Users can see participants if they own the activity
CREATE POLICY "Users can view and manage participants of their activities"
    ON public.activity_participants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = activity_participants.activity_id
            AND a.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS activities_date_idx ON public.activities(date DESC);
CREATE INDEX IF NOT EXISTS activity_participants_activity_id_idx ON public.activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS activity_participants_person_id_idx ON public.activity_participants(person_id);

-- Create trigger for updated_at
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
