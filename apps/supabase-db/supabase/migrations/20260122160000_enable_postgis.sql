-- Enable PostGIS extension for geographic data support
create extension if not exists postgis with schema extensions;

-- Add comment
comment on extension postgis is 'PostGIS geometry and geography spatial types and functions';
