/*
  ✅ Création d'un profil administrateur lié à un utilisateur existant
  - Supprime les anciens profils admin (s'ils existent)
  - Crée un nouveau profil admin dans user_profiles et profils_utilisateurs
  - Applique une policy sécurisée sans récursion
  ⚠️ Prérequis : l'utilisateur 'admin@airtelgpt.com' doit déjà exister dans auth.users
*/

-- Étape 1 : Supprimer les anciens profils admin
DO $$
BEGIN
  DELETE FROM profils_utilisateurs WHERE email = 'admin@airtelgpt.com';
  DELETE FROM user_profiles WHERE email = 'admin@airtelgpt.com';
END $$;

-- Étape 2 : Récupérer le user_id et créer le profil admin
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  -- Cherche l’utilisateur dans auth.users
  SELECT id INTO admin_uid
  FROM auth.users
  WHERE email = 'admin@airtelgpt.com';

  -- S’il existe et qu’aucun profil n’existe encore, on crée les deux entrées
  IF admin_uid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = admin_uid
    ) THEN
      INSERT INTO user_profiles (
        user_id,
        first_name,
        last_name,
        email,
        is_admin,
        created_at,
        updated_at
      ) VALUES (
        admin_uid,
        'Admin',
        'User',
        'admin@airtelgpt.com',
        true,
        now(),
        now()
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM profils_utilisateurs WHERE id = admin_uid
    ) THEN
      INSERT INTO profils_utilisateurs (
        id,
        email,
        is_admin
      ) VALUES (
        admin_uid,
        'admin@airtelgpt.com',
        true
      );
    END IF;
  ELSE
    RAISE NOTICE 'Utilisateur admin@airtelgpt.com introuvable dans auth.users. Créez-le via l’application ou Supabase Studio.';
  END IF;
END $$;

-- Étape 3 : Créer une policy admin sécurisée
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;

CREATE POLICY "Admin full access"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    is_admin = true OR user_id = auth.uid()
  )
  WITH CHECK (
    is_admin = true OR user_id = auth.uid()
  );
