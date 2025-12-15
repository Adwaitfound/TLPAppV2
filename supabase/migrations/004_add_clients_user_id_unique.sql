-- Add unique constraint to clients table user_id
ALTER TABLE clients ADD CONSTRAINT clients_user_id_unique UNIQUE (user_id);
