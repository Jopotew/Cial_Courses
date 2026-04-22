"""
app/services/video_utils.py
----------------------------
Utilidades para procesamiento de videos con FFmpeg.
"""

import subprocess
import tempfile
from pathlib import Path
from typing import BinaryIO


def get_video_duration(file: BinaryIO) -> int | None:
    """
    Extrae la duración de un video usando FFprobe.
    
    Args:
        file: Archivo binario del video
        
    Returns:
        Duración en segundos, o None si falla
    """
    try:
        # Guardar temporalmente el archivo
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            file.seek(0)
            tmp.write(file.read())
            file.seek(0)
            tmp_path = tmp.name
        
        # Ejecutar ffprobe para obtener duración
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                tmp_path
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        
        # Eliminar archivo temporal
        Path(tmp_path).unlink(missing_ok=True)
        
        if result.returncode == 0:
            duration = float(result.stdout.strip())
            return int(duration)
        
        return None
        
    except Exception as e:
        print(f"Error extrayendo duración del video: {e}")
        return None


def validate_video_file(file: BinaryIO, filename: str) -> bool:
    """
    Valida que el archivo sea realmente un video usando FFprobe.
    
    Args:
        file: Archivo binario
        filename: Nombre del archivo
        
    Returns:
        True si es un video válido, False caso contrario
    """
    try:
        # Guardar temporalmente el archivo
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            file.seek(0)
            tmp.write(file.read())
            file.seek(0)
            tmp_path = tmp.name
        
        # Ejecutar ffprobe para validar
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=format_name",
                "-of", "default=noprint_wrappers=1:nokey=1",
                tmp_path
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        
        # Eliminar archivo temporal
        Path(tmp_path).unlink(missing_ok=True)
        
        if result.returncode == 0:
            # Verificar que sea un formato de video válido
            format_name = result.stdout.strip().lower()
            valid_formats = ["mov", "mp4", "m4a", "3gp", "3g2", "mj2", "avi", "mkv", "webm"]
            return any(fmt in format_name for fmt in valid_formats)
        
        return False
        
    except Exception as e:
        print(f"Error validando archivo de video: {e}")
        return False