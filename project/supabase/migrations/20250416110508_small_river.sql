/*
  # Fix Admin User Migration (Version corrigée)
  
  1. Changes
    - Nettoie les anciennes entrées admin
    - Crée un utilisateur admin manuellement (sans toucher à auth.users)
    - Crée les profils dans user_profiles et profils_utilisateurs
    - Applique une policy sécurisée sans récursion
*/

-- Étape 1 : Supprimer les anciens profils si présents
DO $$
BEGIN
  -- Supprimer d'abord le profil secondaire
  DELETE FROM profils_utilisateurs WHERE email = 'admin@airtelgpt.com';

  -- Supprimer ensuite le profil principal
  DELETE FROM user_profiles WHERE email = 'admin@airtelgpt.com';
END $$;

-- Étape 2 : Chercher le user_id dans auth.users
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT id INTO admin_uid
  FROM auth.users
  WHERE email = 'admin@airtelgpt.com';

  -- Si l'utilisateur existe et n’a pas encore de profil
  IF admin_uid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = admin_uid
    ) THEN
      -- Créer le profil admin dans user_profiles
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

      -- Créer également une entrée dans profils_utilisateurs
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
    RAISE NOTICE 'Utilisateur admin@airtelgpt.com non trouvé dans auth.users. Veuillez le créer via l’application.';
  END IF;
END $$;

-- Étape 3 : Appliquer une policy sans récursion
-- Supprimer la policy conflictuelle si elle existe
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;

-- Créer une policy sécurisée et sans récursion
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
