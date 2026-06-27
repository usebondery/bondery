ALTER ROLE powersync_role WITH PASSWORD '';

-- Create a publication to replicate tables. The publication must be named "powersync"
CREATE PUBLICATION powersync FOR ALL TABLES;