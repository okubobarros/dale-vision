from django.db import migrations


FORWARD_SQL = """
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'knox_authtoken'
      AND n.nspname = 'public'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%(user_id)%auth_user%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.knox_authtoken DROP CONSTRAINT %I', constraint_name);
    END IF;

    EXECUTE 'ALTER TABLE public.knox_authtoken ADD CONSTRAINT knox_authtoken_user_id_fkey '
            'FOREIGN KEY (user_id) REFERENCES public.auth_user(id) ON DELETE CASCADE';
END $$;
"""

REVERSE_SQL = """
DO $$
BEGIN
    EXECUTE 'ALTER TABLE public.knox_authtoken DROP CONSTRAINT IF EXISTS knox_authtoken_user_id_fkey';
    EXECUTE 'ALTER TABLE public.knox_authtoken ADD CONSTRAINT knox_authtoken_user_id_fkey '
            'FOREIGN KEY (user_id) REFERENCES public.auth_user(id) ON DELETE NO ACTION';
END $$;
"""


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
