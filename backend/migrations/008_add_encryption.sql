-- Migration 008: Add encryption support for sensitive data
-- Uses pgcrypto for column-level encryption of sensitive fields (e.g., government IDs)

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function: encrypt a text value using AES-256 with a symmetric key
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT, encryption_key TEXT)
RETURNS BYTEA AS $$
  SELECT pgp_sym_encrypt(data, encryption_key, 'cipher-algo=aes256')
$$ LANGUAGE SQL STRICT IMMUTABLE;

-- Helper function: decrypt an encrypted value
CREATE OR REPLACE FUNCTION decrypt_sensitive(data BYTEA, encryption_key TEXT)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(data, encryption_key)
$$ LANGUAGE SQL STRICT IMMUTABLE;

-- Add encrypted columns to waste_picker for future government ID storage
ALTER TABLE waste_picker
  ADD COLUMN IF NOT EXISTS government_id_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS government_id_type VARCHAR(50);

-- Add encrypted columns to client for future government ID storage
ALTER TABLE client
  ADD COLUMN IF NOT EXISTS government_id_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS government_id_type VARCHAR(50);

-- Partial indexes for existence checks on encrypted data
CREATE INDEX IF NOT EXISTS idx_waste_picker_gov_id ON waste_picker (id) WHERE government_id_encrypted IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_gov_id ON client (id) WHERE government_id_encrypted IS NOT NULL;

-- Documentation
COMMENT ON COLUMN waste_picker.government_id_encrypted IS 'AES-256 encrypted government ID. Decrypt with: decrypt_sensitive(government_id_encrypted, key)';
COMMENT ON COLUMN client.government_id_encrypted IS 'AES-256 encrypted government ID. Decrypt with: decrypt_sensitive(government_id_encrypted, key)';
COMMENT ON COLUMN waste_picker.government_id_type IS 'Type of government ID (e.g., national_id, passport, drivers_license)';
COMMENT ON COLUMN client.government_id_type IS 'Type of government ID (e.g., national_id, passport, drivers_license)';
