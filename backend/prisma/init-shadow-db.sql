-- Supabase crea estos schemas por defecto en cada proyecto; la shadow
-- database de Prisma (usada para calcular diffs de migración) empieza
-- vacía y no los tiene, así que hay que crearlos a mano aquí.
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE SCHEMA IF NOT EXISTS "vault";
