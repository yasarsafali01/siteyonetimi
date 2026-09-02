-- Kullanıcı tipi ayrımı: mevcut sistemde tek kullanıcı tipi (süper admin) vardı,
-- kişiler (persons/kat malikleri-kiracılar) ile giriş hesapları (users) arasında hiç
-- bağlantı yoktu. Bu migration, bir kişinin (sakin) kendi login hesabına sahip
-- olabilmesini sağlar; user_type ile yönetici/sakin ayrımı yapılır.

CREATE TYPE user_type AS ENUM ('yonetici', 'sakin');

ALTER TABLE users ADD COLUMN user_type user_type NOT NULL DEFAULT 'yonetici';
ALTER TABLE users ADD COLUMN person_id UUID REFERENCES persons(id) ON DELETE SET NULL;

CREATE INDEX idx_users_person_id ON users(person_id);
-- Bir kişinin en fazla bir login hesabı olabilir.
CREATE UNIQUE INDEX idx_users_person_id_unique ON users(person_id) WHERE person_id IS NOT NULL;
