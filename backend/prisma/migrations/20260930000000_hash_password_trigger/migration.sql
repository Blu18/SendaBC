-- Hash bcrypt de la contraseña al insertar o cambiar "passwordHash" en users.
-- Ya existía en Supabase; se versiona aquí (constitución 5.1) para poder recrear la base.
-- Idempotente: se puede aplicar sobre la base actual sin duplicar el trigger.

CREATE OR REPLACE FUNCTION public.hash_password()
RETURNS trigger
LANGUAGE plpgsql
-- pgcrypto vive en el schema "extensions"; fijar search_path evita depender del rol que inserta.
SET search_path = public, extensions
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash" THEN
        NEW."passwordHash" := crypt(NEW."passwordHash", gen_salt('bf'));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_password_trigger ON public.users;

CREATE TRIGGER hash_password_trigger
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.hash_password();
