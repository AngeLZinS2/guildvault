from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from math import isfinite
from typing import Any
from uuid import UUID, uuid4

import jwt
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from pwdlib import PasswordHash
from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from sqlalchemy.exc import IntegrityError


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://guildvault:guildvault@postgres:5432/guildvault"
    jwt_secret: str = "change-me"
    admin_state_id: str = "00"
    admin_password: str = "change-me-now"
    upload_dir: str = "/app/uploads"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)
password_hash = PasswordHash.recommended()


class Base(DeclarativeBase):
    pass


class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    state_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    alias_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="member")
    status: Mapped[str] = mapped_column(String(32), default="active")
    join_date: Mapped[date] = mapped_column(Date, default=date.today)
    last_activity: Mapped[date | None] = mapped_column(Date, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class Property(Base):
    __tablename__ = "properties"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    number: Mapped[str] = mapped_column(String(64), unique=True)
    type: Mapped[str] = mapped_column(String(80))
    location: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    items: Mapped[list["Item"]] = relationship(back_populates="property", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(160))
    quantity: Mapped[int] = mapped_column(default=1)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    property: Mapped[Property] = relationship(back_populates="items")


class Finance(Base):
    __tablename__ = "finances"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    member_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"))
    type: Mapped[str] = mapped_column(String(32))
    amount: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    date: Mapped[date] = mapped_column(Date, default=date.today)
    proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"), nullable=True)
    verification_notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")


class Goal(Base):
    __tablename__ = "goals"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(160))
    target_amount: Mapped[float] = mapped_column(Float)
    current_amount: Mapped[float] = mapped_column(Float, default=0)
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    end_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PaymentSchedule(Base):
    __tablename__ = "payment_schedule"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(160))
    amount: Mapped[float] = mapped_column(Float)
    due_date: Mapped[date] = mapped_column(Date)
    members: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


MODELS = {"profiles": Profile, "properties": Property, "items": Item, "finances": Finance, "goals": Goal, "payment_schedule": PaymentSchedule}
ADMIN_WRITE = {"properties", "items", "goals", "payment_schedule"}


def db_session():
    with SessionLocal() as session:
        yield session


def serialize(value: Any) -> Any:
    if isinstance(value, (UUID, date, datetime)):
        return value.isoformat() if not isinstance(value, UUID) else str(value)
    return value


def row_dict(row: Base) -> dict[str, Any]:
    result = {column.name: serialize(getattr(row, column.name)) for column in row.__table__.columns if column.name != "password_hash"}
    if isinstance(row, Property):
        result["items"] = [row_dict(item) for item in row.items]
    return result


def clean_payload(model: type[Base], payload: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in payload.items():
        if key not in allowed:
            continue
        column = model.__table__.columns[key]
        if value is not None and isinstance(column.type, Date) and not isinstance(column.type, DateTime) and isinstance(value, str):
            try:
                value = date.fromisoformat(value[:10])
            except ValueError:
                raise HTTPException(422, f"Data inválida: {key}")
        if value is not None and getattr(column.type, "as_uuid", False) and isinstance(value, str):
            try:
                value = UUID(value)
            except ValueError:
                raise HTTPException(422, f"Identificador inválido: {key}")
        result[key] = value
    return result


MAX_MONEY_AMOUNT = 1_000_000_000


def validate_content(model: type[Base], payload: dict[str, Any], row: Base | None = None) -> None:
    def value(key: str, default: Any = None):
        return payload[key] if key in payload else getattr(row, key, default)

    def valid_amount(key: str, allow_zero: bool = False):
        amount = value(key, 0)
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not 0 <= amount <= MAX_MONEY_AMOUNT or not isfinite(amount) or (not allow_zero and amount == 0):
            raise HTTPException(422, f"Valor inválido: {key}. Limite por registro: $1.000.000.000.")

    if model in {Finance, PaymentSchedule}:
        valid_amount("amount")
    if model is Finance and value("type") not in {"deposit", "withdrawal"}:
        raise HTTPException(422, "Tipo de transação inválido")
    if model is Goal:
        valid_amount("target_amount")
        valid_amount("current_amount", True)
    if model is Item:
        quantity = value("quantity", 1)
        if isinstance(quantity, bool) or not isinstance(quantity, int) or not 0 <= quantity <= 2147483647:
            raise HTTPException(422, "Quantidade deve ser um inteiro não negativo")
    if model in {Goal, PaymentSchedule}:
        title = value("title")
        if not isinstance(title, str) or not title.strip() or len(title) > 160:
            raise HTTPException(422, "Título inválido")
        if not isinstance(value("end_date" if model is Goal else "due_date"), date):
            raise HTTPException(422, "Data obrigatória")


def commit_content(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Registro duplicado ou referência inválida. Confira os dados e tente novamente.")


def token_for(user: Profile) -> str:
    payload = {"sub": str(user.id), "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def current_user(request: Request, db: Session = Depends(db_session)) -> Profile:
    header = request.headers.get("Authorization", "")
    try:
        payload = jwt.decode(header.removeprefix("Bearer "), settings.jwt_secret, algorithms=["HS256"])
        user = db.get(Profile, UUID(payload["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        user = None
    if not user or user.status != "active":
        raise HTTPException(401, "Sessão inválida")
    return user


def require_admin(user: Profile = Depends(current_user)) -> Profile:
    if user.role not in {"admin", "superadmin"}:
        raise HTTPException(403, "Acesso administrativo necessário")
    return user


class LoginBody(BaseModel):
    state_id: str
    password: str


app = FastAPI(title="GuildVault API", version="1.0.0")
uploads = Path(settings.upload_dir)


@app.on_event("startup")
def startup() -> None:
    uploads.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(Profile).where(Profile.state_id == settings.admin_state_id)):
            db.add(Profile(state_id=settings.admin_state_id, name="Administrador", role="superadmin", password_hash=password_hash.hash(settings.admin_password)))
            db.commit()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(body: LoginBody, db: Session = Depends(db_session)):
    user = db.scalar(select(Profile).where(Profile.state_id == body.state_id))
    if not user or not password_hash.verify(body.password, user.password_hash):
        raise HTTPException(401, "State ID ou senha inválidos")
    if user.status != "active":
        raise HTTPException(403, "Conta inativa. Solicite a reativação ao administrador.")
    return {"access_token": token_for(user), "user": row_dict(user)}


@app.get("/api/auth/me")
def me(user: Profile = Depends(current_user)):
    return row_dict(user)


@app.get("/api/data/{table}")
def list_rows(table: str, request: Request, db: Session = Depends(db_session), user: Profile = Depends(current_user)):
    model = MODELS.get(table)
    if not model:
        raise HTTPException(404, "Tabela inválida")
    query = select(model)
    for key, value in request.query_params.multi_items():
        if key.startswith("eq_") and hasattr(model, key[3:]):
            field = key[3:]
            parsed = clean_payload(model, {field: value}, {field}).get(field, value)
            query = query.where(getattr(model, field) == parsed)
        elif key.startswith("neq_") and hasattr(model, key[4:]):
            field = key[4:]
            parsed = clean_payload(model, {field: value}, {field}).get(field, value)
            query = query.where(getattr(model, field) != parsed)
        elif key.startswith("gte_") and hasattr(model, key[4:]):
            field = key[4:]
            parsed = clean_payload(model, {field: value}, {field}).get(field, value)
            query = query.where(getattr(model, field) >= parsed)
        elif key.startswith("lte_") and hasattr(model, key[4:]):
            field = key[4:]
            parsed = clean_payload(model, {field: value}, {field}).get(field, value)
            query = query.where(getattr(model, field) <= parsed)
    order = request.query_params.get("order")
    if order and hasattr(model, order):
        column = getattr(model, order)
        query = query.order_by(column.asc() if request.query_params.get("ascending") == "true" else column.desc())
    return [row_dict(row) for row in db.scalars(query).unique().all()]


@app.post("/api/data/{table}")
def create_row(table: str, payload: dict[str, Any], db: Session = Depends(db_session), user: Profile = Depends(current_user)):
    model = MODELS.get(table)
    if not model:
        raise HTTPException(404, "Tabela inválida")
    if table in ADMIN_WRITE and user.role not in {"admin", "superadmin"}:
        raise HTTPException(403, "Acesso administrativo necessário")
    if table == "profiles":
        if user.role not in {"admin", "superadmin"}:
            raise HTTPException(403, "Acesso administrativo necessário")
        requested_role = payload.get("role", "member")
        if requested_role in {"admin", "superadmin"} and user.role != "superadmin":
            raise HTTPException(403, "Somente o superadministrador cria administradores")
        if requested_role == "Membro":
            payload["role"] = "member"
        raw_password = payload.pop("password", None)
        if not raw_password:
            raise HTTPException(422, "Senha obrigatória")
        payload["password_hash"] = password_hash.hash(raw_password)
    if table == "finances" and payload.get("type") == "withdrawal" and user.role not in {"admin", "superadmin"}:
        raise HTTPException(403, "Somente administradores podem registrar retiradas")
    if table == "finances":
        if user.role not in {"admin", "superadmin"}:
            payload["member_id"] = str(user.id)
        payload.update(verified=False, verified_by=None, verification_notes=None, status="pending")
    allowed = {column.name for column in model.__table__.columns} - {"id", "created_at"}
    if table != "profiles":
        allowed.discard("password_hash")
    cleaned = clean_payload(model, payload, allowed)
    validate_content(model, cleaned)
    row = model(**cleaned)
    db.add(row); db.flush()
    app.state.rp_audit(db, user, table, row.id, 'create', row_dict(row))
    commit_content(db); db.refresh(row)
    return row_dict(row)


@app.patch("/api/data/{table}/{row_id}")
def update_row(table: str, row_id: UUID, payload: dict[str, Any], db: Session = Depends(db_session), user: Profile = Depends(current_user)):
    model = MODELS.get(table)
    row = db.scalar(select(model).where(model.id == row_id).with_for_update()) if model else None
    if not row:
        raise HTTPException(404, "Registro não encontrado")
    if table == "profiles" and "role" in payload and user.role != "superadmin":
        raise HTTPException(403, "Somente o superadministrador altera permissões")
    if table == "profiles" and user.role not in {"admin", "superadmin"}:
        raise HTTPException(403, "Acesso administrativo necessário")
    if table == "profiles" and row.id == user.id and (payload.get("status", "active") != "active" or payload.get("role", user.role) != user.role):
        raise HTTPException(403, "Você não pode desativar a própria conta nem remover suas próprias permissões")
    if table != "profiles" and user.role not in {"admin", "superadmin"}:
        raise HTTPException(403, "Acesso administrativo necessário")
    if table == "finances":
        payload.pop("verified_by", None)
        payload.pop("status", None)
        if "verified" in payload:
            if not isinstance(payload["verified"], bool):
                raise HTTPException(422, "Verificação inválida")
            payload["verified_by"] = str(user.id) if payload["verified"] else None
            payload["status"] = "verified" if payload["verified"] else "pending"
    allowed = {column.name for column in model.__table__.columns} - {"id", "created_at", "password_hash"}
    cleaned = clean_payload(model, payload, allowed)
    validate_content(model, cleaned, row)
    before = row_dict(row)
    for key, value in cleaned.items():
        setattr(row, key, value)
    app.state.rp_audit(db, user, table, row.id, 'edit', {'before': before, 'after': row_dict(row)})
    commit_content(db); db.refresh(row)
    return row_dict(row)


@app.delete("/api/data/{table}/{row_id}", status_code=204)
def delete_row(table: str, row_id: UUID, db: Session = Depends(db_session), user: Profile = Depends(require_admin)):
    model = MODELS.get(table)
    row = db.get(model, row_id) if model else None
    if not row:
        raise HTTPException(404, "Registro não encontrado")
    if table == "profiles" and row.id == user.id:
        raise HTTPException(403, "Você não pode excluir a própria conta")
    app.state.rp_audit(db, user, table, row.id, 'delete', row_dict(row))
    db.delete(row); commit_content(db)


@app.post("/api/uploads/{bucket}")
async def upload(bucket: str, file: UploadFile = File(...), user: Profile = Depends(current_user)):
    if bucket not in {"item-icons", "finance-proofs"}:
        raise HTTPException(404, "Destino inválido")
    extension = Path(file.filename or "file").suffix.lower()
    if extension not in {".png", ".jpg", ".jpeg", ".webp", ".pdf"}:
        raise HTTPException(415, "Tipo de arquivo não permitido")
    target = uploads / f"{uuid4()}{extension}"
    target.write_bytes(await file.read())
    return {"url": f"/api/uploads/{target.name}"}


@app.get("/api/uploads/{filename}")
def uploaded_file(filename: str):
    target = uploads / Path(filename).name
    if not target.exists():
        raise HTTPException(404)
    return FileResponse(target)


try:
    from .rp import install as install_rp
except ImportError:
    from rp import install as install_rp
install_rp(globals())
