"""Organization workflows. New tables only; existing accounts and balances are preserved."""
from datetime import date, datetime, timezone
from uuid import UUID, uuid4
from types import SimpleNamespace
from typing import Any

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, String, DateTime, select
from sqlalchemy.orm import Mapped, mapped_column


class Action(BaseModel):
    model_config = ConfigDict(extra='forbid')
    action: str
    note: str = Field(default='', max_length=1000)


class RecordBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str = Field(min_length=2, max_length=160)
    data: dict[str, Any]


class MovementBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    item_id: UUID
    quantity: int = Field(strict=True, gt=0, le=2147483647)
    kind: str
    destination_id: UUID | None = None
    reason: str = Field(min_length=3, max_length=500)


# field -> (kind, required). References are validated against live records.
SCHEMAS = {
    'organization': {'type': ('type', True), 'description': ('text', False)},
    'roles': {'department': ('text', True), 'members': ('members', False), 'permissions': ('permissions', False)},
    'operations': {'category': ('text', True), 'date': ('date', True), 'leader': ('member', True), 'members': ('members', False), 'location': ('text', True), 'instructions': ('text', False), 'vehicle': ('vehicles', False), 'materials': ('ingredients', False), 'income': ('money', False), 'expense': ('money', False)},
    'charges': {'member': ('member', True), 'kind': ('text', False), 'amount': ('money', False), 'item': ('item', False), 'quantity': ('quantity', False), 'date': ('date', True), 'period': ('text', False)},
    'vehicles': {'plate': ('text', True), 'owner': ('member', True), 'location': ('text', True), 'notes': ('text', False)},
    'recruitment': {'state_id': ('text', True), 'contact': ('text', False), 'mentor': ('member', True), 'notes': ('text', False)},
    'training': {'member': ('member', True), 'mentor': ('member', True), 'date': ('date', True), 'notes': ('text', False)},
    'recipes': {'input_item': ('item', False), 'input_quantity': ('quantity', False), 'ingredients': ('ingredients', False), 'output_item': ('item', True), 'output_quantity': ('quantity', True)},
    'orders': {'recipe': ('recipes', True), 'quantity': ('quantity', True), 'member': ('member', True), 'date': ('date', True)},
    'notices': {'category': ('text', True), 'content': ('text', True), 'date': ('date', False)},
}
STATES = {'organization': 'active', 'roles': 'active', 'operations': 'planned', 'charges': 'pending', 'vehicles': 'available', 'recruitment': 'applied', 'training': 'scheduled', 'recipes': 'active', 'orders': 'pending', 'notices': 'published'}
TRANSITIONS = {
    'operations': {'start': (['planned'], 'active'), 'complete': (['active'], 'completed'), 'cancel': (['planned', 'active'], 'cancelled')},
    'charges': {'settle': (['pending'], 'paid'), 'waive': (['pending'], 'waived')},
    'vehicles': {'checkout': (['available'], 'borrowed'), 'return': (['borrowed'], 'available'), 'maintenance': (['available'], 'maintenance'), 'release': (['maintenance'], 'available')},
    'recruitment': {'interview': (['applied'], 'interview'), 'trial': (['interview'], 'trial'), 'approve': (['trial'], 'approved'), 'reject': (['applied', 'interview', 'trial'], 'rejected')},
    'training': {'complete': (['scheduled'], 'completed'), 'cancel': (['scheduled'], 'cancelled')},
    'orders': {'produce': (['pending'], 'produced'), 'deliver': (['produced'], 'delivered'), 'cancel': (['pending'], 'cancelled')},
    'notices': {'archive': (['published'], 'archived')},
}


def install(context):
    c = SimpleNamespace(**context)

    class RPRecord(c.Base):
        __tablename__ = 'rp_records'
        id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
        module: Mapped[str] = mapped_column(String(32), index=True)
        title: Mapped[str] = mapped_column(String(160))
        status: Mapped[str] = mapped_column(String(32))
        data: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    class Audit(c.Base):
        __tablename__ = 'rp_audit'
        id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
        actor: Mapped[str] = mapped_column(String(160))
        actor_id: Mapped[str] = mapped_column(String(36))
        module: Mapped[str] = mapped_column(String(32), index=True)
        record_id: Mapped[str] = mapped_column(String(36))
        action: Mapped[str] = mapped_column(String(64))
        detail: Mapped[dict] = mapped_column(JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def audit(db, user, module, record_id, action, detail=None):
        db.add(Audit(actor=user.name, actor_id=str(user.id), module=module, record_id=str(record_id), action=action, detail=detail or {}))

    def modules_for(db, user):
        if user.role in {'admin', 'superadmin'}:
            return list(SCHEMAS) + ['stock', 'audit']
        result = set()
        for role in db.scalars(select(RPRecord).where(RPRecord.module == 'roles')):
            if str(user.id) in role.data.get('members', []):
                result.update(role.data.get('permissions', []))
        return sorted(result)

    def require(db, user, module):
        if module not in modules_for(db, user):
            raise HTTPException(403, 'Seu cargo não permite gerenciar este módulo')

    def record(db, row_id, module=None):
        row = db.scalar(select(RPRecord).where(RPRecord.id == row_id).with_for_update())
        if not row or (module and row.module != module):
            raise HTTPException(404, 'Registro não encontrado')
        return row

    def validate(db, module, data):
        if module not in SCHEMAS:
            raise HTTPException(404, 'Módulo não encontrado')
        if set(data) - set(SCHEMAS[module]):
            raise HTTPException(422, 'Campos desconhecidos')
        result = {}
        for key, (kind, required) in SCHEMAS[module].items():
            value = data.get(key)
            if value in (None, '', []):
                if required:
                    raise HTTPException(422, f'Campo obrigatório: {key}')
                continue
            valid = True
            if kind in {'text', 'type', 'date'}:
                valid = isinstance(value, str) and bool(value.strip()) and len(value) <= 4000
                if valid:
                    value = value.strip()
                if kind == 'type':
                    valid = value in {'faction', 'company', 'corporation', 'mixed'}
                if kind == 'date':
                    try:
                        date.fromisoformat(value)
                    except (ValueError, TypeError):
                        valid = False
            elif kind in {'money', 'quantity'}:
                valid = type(value) in (int, float) and 0 < value <= (c.MAX_MONEY_AMOUNT if kind == 'money' else 2147483647)
                if kind == 'quantity':
                    valid = valid and type(value) is int
            elif kind in {'member', 'item', 'recipes', 'vehicles'}:
                try:
                    identifier = UUID(value)
                    if kind in {'member', 'item'}:
                        valid = db.get(c.Profile if kind == 'member' else c.Item, identifier) is not None
                    else:
                        related = db.get(RPRecord, identifier)
                        valid = related is not None and related.module == kind
                except (ValueError, TypeError, AttributeError):
                    valid = False
            elif kind == 'ingredients':
                valid = isinstance(value, list) and 1 <= len(value) <= 50
                if valid:
                    seen = set()
                    for ingredient in value:
                        if not isinstance(ingredient, dict) or set(ingredient) != {'item', 'quantity'}:
                            valid = False; break
                        try:
                            item_id = UUID(ingredient['item'])
                            quantity = ingredient['quantity']
                            if item_id in seen or db.get(c.Item, item_id) is None or type(quantity) is not int or not 0 < quantity <= 2147483647:
                                valid = False; break
                            seen.add(item_id)
                        except (ValueError, TypeError, AttributeError):
                            valid = False; break
            elif kind in {'members', 'permissions'}:
                valid = isinstance(value, list) and len(value) <= 500 and all(isinstance(v, str) for v in value)
                if valid and kind == 'permissions':
                    valid = set(value) <= (set(SCHEMAS) - {'organization', 'roles'} | {'stock', 'audit'})
                if valid and kind == 'members':
                    try:
                        valid = all(db.get(c.Profile, UUID(v)) is not None for v in value)
                    except ValueError:
                        valid = False
            if not valid:
                raise HTTPException(422, f'Valor inválido: {key}')
            result[key] = value
        if module == 'recipes':
            ingredients = result.get('ingredients') or ([{'item': result['input_item'], 'quantity': result['input_quantity']}] if 'input_item' in result and 'input_quantity' in result else [])
            if not ingredients or any(i['item'] == result['output_item'] for i in ingredients):
                raise HTTPException(422, 'Informe materiais diferentes do produto final')
            result['ingredients'] = ingredients
        if module == 'charges':
            kind = result.get('kind', 'money')
            if kind not in {'money', 'item'} or (kind == 'money' and 'amount' not in result) or (kind == 'item' and not {'item', 'quantity'} <= result.keys()):
                raise HTTPException(422, 'Informe o valor em dinheiro ou o item e a quantidade da contribuição')
        return result

    def move(db, user, item, delta, reason):
        new_quantity = item.quantity + delta
        if not 0 <= new_quantity <= 2147483647:
            raise HTTPException(409, f'Estoque insuficiente ou acima do limite: {item.name}')
        before = item.quantity
        item.quantity = new_quantity
        audit(db, user, 'stock', item.id, 'movement', {'item': item.name, 'before': before, 'after': new_quantity, 'quantity': delta, 'reason': reason})

    @c.app.get('/api/rp/context')
    def rp_context(db=Depends(c.db_session), user=Depends(c.current_user)):
        return {'permissions': modules_for(db, user), 'user_id': str(user.id), 'schemas': SCHEMAS}

    @c.app.get('/api/rp/records/{module}')
    def list_records(module: str, db=Depends(c.db_session), user=Depends(c.current_user)):
        if module not in SCHEMAS:
            raise HTTPException(404, 'Módulo não encontrado')
        if module == 'recruitment':
            require(db, user, module)
        rows = db.scalars(select(RPRecord).where(RPRecord.module == module).order_by(RPRecord.created_at.desc())).all()
        if module in {'charges', 'training'} and module not in modules_for(db, user):
            rows = [r for r in rows if r.data.get('member') == str(user.id)]
        return [c.row_dict(r) for r in rows]

    @c.app.post('/api/rp/records/{module}')
    def create_record(module: str, body: RecordBody, db=Depends(c.db_session), user=Depends(c.current_user)):
        require(db, user, module)
        if not body.title.strip():
            raise HTTPException(422, 'Título obrigatório')
        if module == 'organization' and db.scalar(select(RPRecord).where(RPRecord.module == module)):
            raise HTTPException(409, 'Edite a organização existente')
        row = RPRecord(module=module, title=body.title.strip(), data=validate(db, module, body.data), status=STATES[module])
        db.add(row); db.flush()
        audit(db, user, module, row.id, 'create', {'title': row.title, 'data': row.data})
        c.commit_content(db)
        return c.row_dict(row)

    @c.app.put('/api/rp/records/{row_id}')
    def edit_record(row_id: UUID, body: RecordBody, db=Depends(c.db_session), user=Depends(c.current_user)):
        row = record(db, row_id)
        require(db, user, row.module)
        if row.status != STATES[row.module]:
            raise HTTPException(409, 'Somente registros no estado inicial podem ser editados')
        if not body.title.strip():
            raise HTTPException(422, 'Título obrigatório')
        before = {'title': row.title, 'data': row.data}
        data = validate(db, row.module, body.data)
        row.title = body.title.strip()
        row.data = {**data, **{key: value for key, value in row.data.items() if key.startswith('_')}}
        audit(db, user, row.module, row.id, 'edit', {'before': before, 'after': {'title': row.title, 'data': row.data}})
        c.commit_content(db)
        return c.row_dict(row)

    @c.app.post('/api/rp/actions/{row_id}')
    def act(row_id: UUID, body: Action, db=Depends(c.db_session), user=Depends(c.current_user)):
        row = record(db, row_id)
        data = dict(row.data)
        if body.action in {'attend', 'read'}:
            module, field = ('operations', '_attendance') if body.action == 'attend' else ('notices', '_readers')
            if row.module != module or row.status not in {'planned', 'active', 'published'}:
                raise HTTPException(409, 'Ação indisponível')
            values = list(data.get(field, []))
            if str(user.id) in values:
                return c.row_dict(row)
            values.append(str(user.id)); data[field] = values
        else:
            require(db, user, row.module)
            transition = TRANSITIONS.get(row.module, {}).get(body.action)
            if not transition or row.status not in transition[0]:
                raise HTTPException(409, 'Ação já realizada ou indisponível neste estado')
            if body.action in {'complete', 'waive', 'reject', 'cancel', 'maintenance'} and len(body.note.strip()) < 3:
                raise HTTPException(422, 'Informe o resultado ou motivo da ação')
            if row.module == 'charges' and body.action == 'settle':
                if data.get('kind', 'money') == 'money':
                    finance = c.Finance(member_id=UUID(data['member']), type='deposit', amount=data['amount'], description=f"Quitação: {row.title}", verified=False, status='pending')
                    db.add(finance); db.flush()
                    data['_finance_id'] = str(finance.id)
                else:
                    item = db.scalar(select(c.Item).where(c.Item.id == UUID(data['item'])).with_for_update())
                    if item is None:
                        raise HTTPException(409, 'Item da contribuição não existe mais')
                    move(db, user, item, data['quantity'], f'Contribuição: {row.title}')
            if row.module == 'operations':
                if data.get('materials') and (body.action == 'start' or (body.action == 'cancel' and row.status == 'active')):
                    allocations = data['materials']
                    ids = sorted(UUID(i['item']) for i in allocations)
                    items = {str(i.id): i for i in db.scalars(select(c.Item).where(c.Item.id.in_(ids)).order_by(c.Item.id).with_for_update())}
                    if len(items) != len(ids):
                        raise HTTPException(409, 'Material da operação não existe mais')
                    for allocation in allocations:
                        move(db, user, items[allocation['item']], allocation['quantity'] * (-1 if body.action == 'start' else 1), f'Operação: {row.title} ({body.action})')
                if data.get('vehicle'):
                    vehicle = record(db, UUID(data['vehicle']), 'vehicles')
                    if body.action == 'start':
                        if vehicle.status != 'available':
                            raise HTTPException(409, 'O veículo já está em uso ou em manutenção')
                        vehicle.status = 'borrowed'
                        vehicle.data = {**vehicle.data, '_borrower': data['leader'], '_operation': str(row.id)}
                        audit(db, user, 'vehicles', vehicle.id, 'checkout', {'operation': row.title})
                    elif body.action in {'complete', 'cancel'} and vehicle.data.get('_operation') == str(row.id):
                        vehicle.status = 'available'
                        vehicle.data = {**vehicle.data, '_borrower': None, '_operation': None}
                        audit(db, user, 'vehicles', vehicle.id, 'return', {'operation': row.title})
                if body.action == 'complete':
                    finance_ids = []
                    for key, kind in [('income', 'deposit'), ('expense', 'withdrawal')]:
                        if data.get(key):
                            finance = c.Finance(member_id=UUID(data['leader']), type=kind, amount=data[key], description=f'Operação: {row.title}', verified=False, status='pending')
                            db.add(finance); db.flush(); finance_ids.append(str(finance.id))
                    data['_finance_ids'] = finance_ids
            if row.module == 'vehicles':
                if data.get('_operation'):
                    raise HTTPException(409, 'Conclua ou cancele a operação vinculada para devolver este veículo')
                data['_borrower'] = str(user.id) if body.action == 'checkout' else None
            if row.module == 'orders' and body.action == 'produce':
                recipe = record(db, UUID(data['recipe']), 'recipes')
                spec = recipe.data
                ingredients = spec.get('ingredients') or [{'item': spec['input_item'], 'quantity': spec['input_quantity']}]
                ids = sorted([UUID(i['item']) for i in ingredients] + [UUID(spec['output_item'])])
                items = {str(i.id): i for i in db.scalars(select(c.Item).where(c.Item.id.in_(ids)).order_by(c.Item.id).with_for_update())}
                if len(items) != len(ids):
                    raise HTTPException(409, 'Itens da receita não existem mais')
                for ingredient in ingredients:
                    move(db, user, items[ingredient['item']], -ingredient['quantity'] * data['quantity'], f'Produção: {row.title}')
                move(db, user, items[spec['output_item']], spec['output_quantity'] * data['quantity'], f'Produção: {row.title}')
                data['_recipe_snapshot'] = spec
            row.status = transition[1]
        if body.note.strip():
            data['_last_note'] = body.note.strip()
        row.data = data
        audit(db, user, row.module, row.id, body.action, {'title': row.title, 'status': row.status, 'note': body.note})
        c.commit_content(db)
        return c.row_dict(row)

    @c.app.post('/api/rp/stock')
    def stock(body: MovementBody, db=Depends(c.db_session), user=Depends(c.current_user)):
        require(db, user, 'stock')
        if body.kind not in {'entry', 'exit', 'transfer'}:
            raise HTTPException(422, 'Movimento inválido')
        ids = [body.item_id]
        if body.kind == 'transfer':
            if not body.destination_id or body.destination_id == body.item_id:
                raise HTTPException(422, 'Escolha outro item de destino')
            ids.append(body.destination_id)
        items = {i.id: i for i in db.scalars(select(c.Item).where(c.Item.id.in_(sorted(ids))).order_by(c.Item.id).with_for_update())}
        if len(items) != len(ids):
            raise HTTPException(404, 'Item não encontrado')
        source = items[body.item_id]
        if body.kind == 'transfer':
            target = items[body.destination_id]
            if target.name.strip().casefold() != source.name.strip().casefold() or target.property_id == source.property_id:
                raise HTTPException(422, 'Transfira o mesmo item entre propriedades diferentes')
            move(db, user, target, body.quantity, body.reason)
        move(db, user, source, body.quantity if body.kind == 'entry' else -body.quantity, body.reason)
        c.commit_content(db)
        return {'success': True}

    @c.app.get('/api/rp/audit')
    def history(limit: int = 100, db=Depends(c.db_session), user=Depends(c.current_user)):
        require(db, user, 'audit')
        return [c.row_dict(r) for r in db.scalars(select(Audit).order_by(Audit.created_at.desc()).limit(max(1, min(limit, 500))))]

    @c.app.get('/api/rp/inbox')
    def inbox(db=Depends(c.db_session), user=Depends(c.current_user)):
        result = []
        for row in db.scalars(select(RPRecord).where(RPRecord.module.in_(['notices', 'charges', 'training', 'operations']))):
            data = row.data
            unread = row.module == 'notices' and row.status == 'published' and str(user.id) not in data.get('_readers', [])
            assigned = data.get('member') == str(user.id) and row.status in {'pending', 'scheduled'}
            invited = row.module == 'operations' and row.status == 'planned' and str(user.id) in data.get('members', []) and str(user.id) not in data.get('_attendance', [])
            if unread or assigned or invited:
                result.append({'id': str(row.id), 'title': row.title, 'module': row.module, 'date': data.get('date'), 'status': row.status})
        return sorted(result, key=lambda r: (r['date'] or '9999', r['title']))

    @c.app.get('/api/rp/report')
    def report(start: date, end: date, db=Depends(c.db_session), user=Depends(c.current_user)):
        require(db, user, 'audit')
        if end < start:
            raise HTTPException(422, 'A data final deve ser posterior à inicial')
        finances = db.scalars(select(c.Finance).where(c.Finance.date >= start, c.Finance.date <= end)).all()
        rows = {}
        totals = {'income': 0, 'expense': 0, 'pending': 0}
        for finance in finances:
            key = str(finance.member_id)
            if key not in rows:
                profile = db.get(c.Profile, finance.member_id)
                rows[key] = {'member': profile.name if profile else 'Membro removido', 'income': 0, 'expense': 0, 'pending': 0}
            field = 'pending' if not finance.verified else 'income' if finance.type == 'deposit' else 'expense'
            rows[key][field] += finance.amount
            totals[field] += finance.amount
        return {'start': start.isoformat(), 'end': end.isoformat(), 'totals': totals, 'members': list(rows.values())}

    # Hook existing CRUD into the same append-only journal, without exposing secrets.
    c.app.state.rp_audit = audit
