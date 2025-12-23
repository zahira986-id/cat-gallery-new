
-- Enable UUID extension if needed (Supabase usually has this, but good to be safe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cats Table
CREATE TABLE IF NOT EXISTS cats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tag VARCHAR(255),
    descreption TEXT, -- Keeping the typo 'descreption' to match existing code
    img TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Adoptions Table (Many-to-Many relationship between Users and Cats)
CREATE TABLE IF NOT EXISTS adoptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_id INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    adopted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, cat_id) -- Prevent adopting the same cat twice
);

-- 4. Sessions Table (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    user_id INTEGER, -- Optional: link session to user for easier cleanup
    CONSTRAINT sessions_pkey PRIMARY KEY (sid)
)
WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- 5. Seed Initial Data (Cats) - Only inserts if table is empty
INSERT INTO cats (name, tag, descreption, img)
SELECT 'Mistigri', 'tigré', 'Un chat très curieux et joueur.', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
WHERE NOT EXISTS (SELECT 1 FROM cats);

INSERT INTO cats (name, tag, descreption, img)
SELECT 'Luna', 'européen', 'Douce et calme, elle adore les câlins.', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
WHERE NOT EXISTS (SELECT 1 FROM cats WHERE name = 'Luna');

INSERT INTO cats (name, tag, descreption, img)
SELECT 'Simba', 'roux', 'Un petit lionceau plein d''énergie.', 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
WHERE NOT EXISTS (SELECT 1 FROM cats WHERE name = 'Simba');
