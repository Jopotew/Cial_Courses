-- ============================================================
-- Migration: Add modules + course_files tables
-- Run this in the Supabase SQL Editor BEFORE deploying
-- ============================================================

-- 1. Tabla de módulos del curso
CREATE TABLE IF NOT EXISTS modules (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    "order"     INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);

-- 2. Agregar module_id a videos (nullable — videos existentes no tienen módulo)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_videos_module_id ON videos(module_id);

-- 3. Tabla de archivos del curso (PDFs, DOCs, etc.)
CREATE TABLE IF NOT EXISTS course_files (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id        UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name             TEXT        NOT NULL,
    file_url         TEXT        NOT NULL,
    storage_path     TEXT        NOT NULL,
    file_type        TEXT        NOT NULL DEFAULT 'pdf',
    file_size_bytes  BIGINT,
    "order"          INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_files_course_id ON course_files(course_id);

-- 4. Bucket de storage para archivos de curso
-- Crear manualmente en Supabase Dashboard > Storage > New Bucket:
--   Name: course-files
--   Public: true   (los archivos son públicos para descargar)
