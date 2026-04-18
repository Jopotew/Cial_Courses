"""
app/db/models.py
----------------
Definición de tablas de la base de datos con SQLAlchemy ORM.

Tablas actuales:
    - roles     → catálogo de roles (admin, client)
    - users     → usuarios del sistema con FK a roles

Convenciones:
    - PKs son UUID v4 generados por la DB (gen_random_uuid()).
    - Timestamps siempre en UTC con timezone=True.
    - Soft delete con is_active=False: los registros nunca se borran
      para preservar integridad de pagos y progreso histórico.
    - El campo 'password' almacena el hash bcrypt, nunca texto plano.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


# ──────────────────────────────────────────────────────────────────────────────
# Base declarativa
# ──────────────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """
    Clase base de la que heredan todos los modelos ORM.
    SQLAlchemy la usa para registrar las tablas y generar
    el metadata que Alembic necesita para las migraciones.
    """
    pass


# ──────────────────────────────────────────────────────────────────────────────
# Mixin de timestamps
# ──────────────────────────────────────────────────────────────────────────────

class TimestampMixin:
    """
    Agrega created_at y updated_at a cualquier tabla que lo herede.
    Ambos se guardan en UTC.
    """

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        default=lambda: datetime.now(timezone.utc),
        comment="Fecha y hora de creación del registro (UTC).",
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        comment="Fecha y hora de última modificación (UTC).",
    )


# ──────────────────────────────────────────────────────────────────────────────
# Tabla: roles
# ──────────────────────────────────────────────────────────────────────────────

class Role(Base):
    """
    Catálogo de roles del sistema.

    Valores fijos en la DB:
        id=1 → admin
        id=2 → client

    No hereda TimestampMixin porque es una tabla de catálogo
    que no cambia y no necesita auditoría de fechas.
    """

    __tablename__ = "roles"

    id = Column(
        BigInteger,
        primary_key=True,
        comment="Identificador del rol.",
    )

    name = Column(
        String(20),
        nullable=False,
        unique=True,
        comment="Nombre del rol: admin | client.",
    )

    # Relación inversa: permite acceder a todos los usuarios de un rol.
    # Ej: role.users → lista de User con ese rol.
    users = relationship("User", back_populates="role_rel")

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name}>"


# ──────────────────────────────────────────────────────────────────────────────
# Tabla: users
# ──────────────────────────────────────────────────────────────────────────────

class User(TimestampMixin, Base):
    """
    Representa la tabla 'users' en PostgreSQL.

    Identificación: email + username (ambos únicos).
    Autenticación: password almacena el hash bcrypt.
    Rol: FK a la tabla roles (1=admin, 2=client).
    Soft delete: is_active=False desactiva la cuenta sin borrar el registro.
    """

    __tablename__ = "users"

    # ── Identificación ────────────────────────────────────────────────────

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        comment="Identificador único del usuario (UUID v4).",
    )

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="Email del usuario. Identificador principal de login.",
    )

    username = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Nombre de usuario único. Identificador secundario.",
    )

    full_name = Column(
        String(100),
        nullable=True,
        comment="Nombre completo del usuario.",
    )

    # ── Autenticación ─────────────────────────────────────────────────────

    password = Column(
        String(255),
        nullable=False,
        comment=(
            "Hash bcrypt de la contraseña. "
            "Nunca almacenar ni loguear en texto plano."
        ),
    )

    # ── Rol ───────────────────────────────────────────────────────────────

    role = Column(
        BigInteger,
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        default=2,          # 2 = client por defecto
        server_default="2",
        comment="FK a roles. 1=admin, 2=client.",
    )

    # Relación ORM: permite acceder al objeto Role desde un User.
    # Ej: user.role_rel.name → "client"
    role_rel = relationship("Role", back_populates="users")

    # ── Estado de la cuenta ───────────────────────────────────────────────

    is_verified = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="True si el usuario verificó su email al registrarse.",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="False si el usuario fue dado de baja (soft delete).",
    )

    # ── Doble factor (2FA) ────────────────────────────────────────────────

    last_2fa_verified_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        comment=(
            "Última vez que el usuario completó el 2FA por email. "
            "Si es None o tiene más de 30 días, se pide el código al login."
        ),
    )

    # ── Auditoría ─────────────────────────────────────────────────────────

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        comment="Fecha y hora del último login exitoso.",
    )

    def __repr__(self) -> str:
        """Representación legible para debugging y logs."""
        return f"<User id={self.id} username={self.username} role={self.role}>"