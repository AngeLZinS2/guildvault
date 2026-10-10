import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class ContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(prefix="guildvault-content-test-")
        folder = Path(cls.directory.name)
        os.environ["DATABASE_URL"] = f"sqlite:///{(folder / 'test.db').as_posix()}"
        os.environ["UPLOAD_DIR"] = str(folder / "uploads")
        os.environ["JWT_SECRET"] = "isolated-test-secret-never-production"
        os.environ["ADMIN_PASSWORD"] = "isolated-test-password"
        from backend import main
        if main.engine.url.get_backend_name() != "sqlite" or Path(main.engine.url.database).resolve().parent != folder.resolve():
            raise RuntimeError("Os testes de conteúdo exigem seu próprio banco temporário isolado")
        cls.api = main
        cls.client_context = TestClient(main.app)
        cls.client = cls.client_context.__enter__()
        login = cls.client.post("/api/auth/login", json={"state_id": "00", "password": "isolated-test-password"}).json()
        cls.admin = {"Authorization": f"Bearer {login['access_token']}"}
        cls.admin_id = login["user"]["id"]
        profile = cls.client.post("/api/data/profiles", headers=cls.admin, json={"name": "Test member", "state_id": "test-member", "role": "member", "password": "isolated-member-password"}).json()
        cls.member_id = profile["id"]
        member_login = cls.client.post("/api/auth/login", json={"state_id": "test-member", "password": "isolated-member-password"}).json()
        cls.member = {"Authorization": f"Bearer {member_login['access_token']}"}

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)
        cls.api.engine.dispose()
        cls.directory.cleanup()

    def test_profiles_never_expose_hash(self):
        profiles = self.client.get("/api/data/profiles", headers=self.member).json()
        self.assertTrue(profiles)
        self.assertTrue(all("password_hash" not in profile for profile in profiles))
        self.assertNotIn("password_hash", self.client.get("/api/auth/me", headers=self.admin).json())

    def test_goals_lifecycle_and_validation(self):
        payload = {"title": "Test goal", "target_amount": 200, "current_amount": 0, "end_date": "2026-11-01"}
        self.assertEqual(self.client.post("/api/data/goals", headers=self.member, json=payload).status_code, 403)
        for updates in [{"target_amount": -1}, {"current_amount": -1}, {"end_date": "2026-02-30"}]:
            self.assertEqual(self.client.post("/api/data/goals", headers=self.admin, json={**payload, **updates}).status_code, 422)
        created = self.client.post("/api/data/goals", headers=self.admin, json=payload)
        self.assertEqual(created.status_code, 200)
        goal_id = created.json()["id"]
        edited = self.client.patch(f"/api/data/goals/{goal_id}", headers=self.admin, json={"current_amount": 200})
        self.assertEqual(edited.json()["current_amount"], 200)
        self.assertEqual(self.client.delete(f"/api/data/goals/{goal_id}", headers=self.admin).status_code, 204)

    def test_inventory_zero_and_invalid_quantities(self):
        property_row = self.client.post("/api/data/properties", headers=self.admin, json={"number": "test-property", "type": "Pequena", "location": "Test"}).json()
        payload = {"property_id": property_row["id"], "name": "Test item", "quantity": 5}
        item = self.client.post("/api/data/items", headers=self.admin, json=payload).json()
        for quantity in [-1, 1.5, True, 2147483648]:
            self.assertEqual(self.client.patch(f"/api/data/items/{item['id']}", headers=self.admin, json={"quantity": quantity}).status_code, 422)
        self.assertEqual(self.client.patch(f"/api/data/items/{item['id']}", headers=self.member, json={"quantity": 0}).status_code, 403)
        self.assertEqual(self.client.patch(f"/api/data/items/{item['id']}", headers=self.admin, json={"quantity": 0}).json()["quantity"], 0)

    def test_finance_approval_is_server_owned(self):
        payload = {"type": "deposit", "amount": 10, "member_id": self.admin_id, "verified": True, "status": "verified", "verified_by": self.admin_id}
        finance = self.client.post("/api/data/finances", headers=self.member, json=payload).json()
        self.assertEqual(finance["member_id"], self.member_id)
        self.assertFalse(finance["verified"])
        self.assertEqual(finance["status"], "pending")
        self.assertIsNone(finance["verified_by"])
        endpoint = f"/api/data/finances/{finance['id']}"
        self.assertEqual(self.client.patch(endpoint, headers=self.member, json={"verified": True}).status_code, 403)
        approved = self.client.patch(endpoint, headers=self.admin, json={"verified": True, "verified_by": self.member_id}).json()
        self.assertEqual(approved["verified_by"], self.admin_id)
        self.assertEqual(approved["status"], "verified")
        reverted = self.client.patch(endpoint, headers=self.admin, json={"verified": False}).json()
        self.assertIsNone(reverted["verified_by"])
        self.assertEqual(reverted["status"], "pending")
        for amount in [0, -5, "abc"]:
            self.assertEqual(self.client.post("/api/data/finances", headers=self.admin, json={**payload, "amount": amount}).status_code, 422)

    def test_money_limit_on_create_and_update(self):
        cases = [
            ("finances", {"type": "deposit", "amount": 10, "member_id": self.member_id}, ["amount"]),
            ("payment_schedule", {"title": "Limit test", "amount": 10, "due_date": "2026-11-01", "members": [self.member_id]}, ["amount"]),
            ("goals", {"title": "Limit test", "target_amount": 10, "current_amount": 0, "end_date": "2026-11-01"}, ["target_amount", "current_amount"]),
        ]
        for table, payload, fields in cases:
            endpoint = f"/api/data/{table}"
            created = self.client.post(endpoint, headers=self.admin, json=payload)
            self.assertEqual(created.status_code, 200)
            row_endpoint = f"{endpoint}/{created.json()['id']}"
            for field in fields:
                for amount in [1e60, 10**400, 1_000_000_001]:
                    with self.subTest(table=table, field=field, amount=amount):
                        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={**payload, field: amount}).status_code, 422)
                        self.assertEqual(self.client.patch(row_endpoint, headers=self.admin, json={field: amount}).status_code, 422)
                self.assertEqual(self.client.patch(row_endpoint, headers=self.admin, json={field: 1_000_000_000}).status_code, 200)
            self.assertEqual(self.client.delete(row_endpoint, headers=self.admin).status_code, 204)

    def test_rp_roles_and_private_records(self):
        endpoint = '/api/rp/records/roles'
        payload = {'title': 'Logística', 'data': {'department': 'Operações', 'members': [self.member_id], 'permissions': ['stock', 'operations']}}
        self.assertEqual(self.client.post(endpoint, headers=self.member, json=payload).status_code, 403)
        role = self.client.post(endpoint, headers=self.admin, json=payload).json()
        self.assertIn('stock', self.client.get('/api/rp/context', headers=self.member).json()['permissions'])
        self.assertEqual(self.client.put(f"/api/rp/records/{role['id']}", headers=self.member, json=payload).status_code, 403)
        self.assertEqual(self.client.get('/api/rp/records/recruitment', headers=self.member).status_code, 403)
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={**payload, 'data': {**payload['data'], 'permissions': ['roles']}}).status_code, 422)

    def test_rp_charge_settlement_only_once(self):
        body = {'title': 'Contribuição semanal', 'data': {'member': self.member_id, 'amount': 250, 'date': '2026-11-01'}}
        created = self.client.post('/api/rp/records/charges', headers=self.admin, json=body)
        self.assertEqual(created.status_code, 200)
        row_id = created.json()['id']
        endpoint = f'/api/rp/actions/{row_id}'
        settled = self.client.post(endpoint, headers=self.admin, json={'action': 'settle'})
        self.assertEqual(settled.status_code, 200)
        finance_id = settled.json()['data']['_finance_id']
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'settle'}).status_code, 409)
        finance = self.client.get(f'/api/data/finances?eq_id={finance_id}', headers=self.admin).json()[0]
        self.assertEqual(finance['amount'], 250)
        self.assertFalse(finance['verified'])
        self.assertEqual(self.client.put(f'/api/rp/records/{row_id}', headers=self.admin, json=body).status_code, 409)
        bad = {**body, 'data': {**body['data'], 'amount': 1e59}}
        self.assertEqual(self.client.post('/api/rp/records/charges', headers=self.admin, json=bad).status_code, 422)

    def test_rp_stock_and_production_are_atomic(self):
        def create(table, body):
            response = self.client.post('/api/data/' + table, headers=self.admin, json=body)
            self.assertEqual(response.status_code, 200, response.text)
            return response.json()
        first = create('properties', {'number': 'rp-factory', 'type': 'Empresa', 'location': 'Centro'})
        second = create('properties', {'number': 'rp-store', 'type': 'Empresa', 'location': 'Norte'})
        material = create('items', {'name': 'Material', 'quantity': 10, 'property_id': first['id']})
        target = create('items', {'name': 'Material', 'quantity': 0, 'property_id': second['id']})
        output = create('items', {'name': 'Produto', 'quantity': 0, 'property_id': first['id']})
        move = {'kind': 'transfer', 'item_id': material['id'], 'destination_id': target['id'], 'quantity': 11, 'reason': 'Reposição'}
        self.assertEqual(self.client.post('/api/rp/stock', headers=self.admin, json=move).status_code, 409)
        def quantity(item):
            return self.client.get('/api/data/items?eq_id=' + item['id'], headers=self.admin).json()[0]['quantity']
        self.assertEqual(quantity(target), 0)
        self.assertEqual(quantity(material), 10)
        self.assertEqual(self.client.post('/api/rp/stock', headers=self.admin, json={**move, 'quantity': 2}).status_code, 200)
        self.assertEqual(quantity(target), 2)
        recipe = self.client.post('/api/rp/records/recipes', headers=self.admin, json={'title': 'Receita teste', 'data': {'input_item': material['id'], 'input_quantity': 2, 'output_item': output['id'], 'output_quantity': 3}}).json()
        order = self.client.post('/api/rp/records/orders', headers=self.admin, json={'title': 'Pedido teste', 'data': {'recipe': recipe['id'], 'quantity': 2, 'member': self.member_id, 'date': '2026-11-01'}}).json()
        endpoint = '/api/rp/actions/' + order['id']
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'produce'}).status_code, 200)
        self.assertEqual(quantity(material), 4)
        self.assertEqual(quantity(output), 6)
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'produce'}).status_code, 409)
        self.assertEqual(quantity(output), 6)

    def test_rp_multiple_materials_rollback_and_operation_return(self):
        prop = self.client.post('/api/data/properties', headers=self.admin, json={'number': 'multi-material', 'type': 'Empresa', 'location': 'Centro'}).json()
        def item(name, quantity):
            return self.client.post('/api/data/items', headers=self.admin, json={'property_id': prop['id'], 'name': name, 'quantity': quantity}).json()
        one, two, product = item('Material A', 10), item('Material B', 1), item('Produto AB', 0)
        ingredients = [{'item': one['id'], 'quantity': 3}, {'item': two['id'], 'quantity': 2}]
        recipe = self.client.post('/api/rp/records/recipes', headers=self.admin, json={'title': 'Receita composta', 'data': {'ingredients': ingredients, 'output_item': product['id'], 'output_quantity': 1}}).json()
        order = self.client.post('/api/rp/records/orders', headers=self.admin, json={'title': 'Pedido composto', 'data': {'recipe': recipe['id'], 'quantity': 1, 'member': self.member_id, 'date': '2026-11-01'}}).json()
        self.assertEqual(self.client.post('/api/rp/actions/' + order['id'], headers=self.admin, json={'action': 'produce'}).status_code, 409)
        def stock(row):
            return self.client.get('/api/data/items?eq_id=' + row['id'], headers=self.admin).json()[0]['quantity']
        self.assertEqual(stock(one), 10)
        self.assertEqual(stock(two), 1)
        self.assertEqual(stock(product), 0)
        operation = self.client.post('/api/rp/records/operations', headers=self.admin, json={'title': 'Retirada e devolução', 'data': {'category': 'Treino', 'date': '2026-11-01', 'leader': self.admin_id, 'location': 'Base', 'materials': [ingredients[0]]}}).json()
        endpoint = '/api/rp/actions/' + operation['id']
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'start'}).status_code, 200)
        self.assertEqual(stock(one), 7)
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'cancel', 'note': 'Treino cancelado'}).status_code, 200)
        self.assertEqual(stock(one), 10)
        charge = self.client.post('/api/rp/records/charges', headers=self.admin, json={'title': 'Entrega de material', 'data': {'member': self.member_id, 'kind': 'item', 'item': two['id'], 'quantity': 5, 'date': '2026-11-01'}}).json()
        self.assertEqual(self.client.post('/api/rp/actions/' + charge['id'], headers=self.admin, json={'action': 'settle'}).status_code, 200)
        self.assertEqual(stock(two), 6)
        self.assertEqual(self.client.post('/api/rp/actions/' + order['id'], headers=self.admin, json={'action': 'produce'}).status_code, 200)
        self.assertEqual(stock(one), 7)
        self.assertEqual(stock(two), 4)
        self.assertEqual(stock(product), 1)

    def test_rp_notice_and_operation_participation(self):
        notice = self.client.post('/api/rp/records/notices', headers=self.admin, json={'title': 'Regulamento', 'data': {'category': 'Regras', 'content': 'Respeitar os demais.'}}).json()
        endpoint = '/api/rp/actions/' + notice['id']
        for _ in range(2):
            self.assertEqual(self.client.post(endpoint, headers=self.member, json={'action': 'read'}).status_code, 200)
        notices = self.client.get('/api/rp/records/notices', headers=self.member).json()
        current = next(r for r in notices if r['id'] == notice['id'])
        self.assertEqual(current['data']['_readers'], [self.member_id])
        self.assertEqual(self.client.post(endpoint, headers=self.member, json={'action': 'archive'}).status_code, 403)
        operation = self.client.post('/api/rp/records/operations', headers=self.admin, json={'title': 'Reunião', 'data': {'category': 'Reunião', 'date': '2026-11-01', 'leader': self.admin_id, 'location': 'Base'}}).json()
        endpoint = '/api/rp/actions/' + operation['id']
        self.assertEqual(self.client.post(endpoint, headers=self.member, json={'action': 'attend'}).status_code, 200)
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'complete', 'note': 'Finalizada'}).status_code, 409)
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'start'}).status_code, 200)
        self.assertEqual(self.client.post(endpoint, headers=self.admin, json={'action': 'complete', 'note': 'Finalizada'}).status_code, 200)

    def test_rp_vehicle_recruitment_training_and_audit(self):
        cases = [
            ('vehicles', {'plate': 'RP-001', 'owner': self.member_id, 'location': 'Garagem'}, ['checkout', 'return', 'maintenance', 'release']),
            ('recruitment', {'state_id': 'candidate-1', 'mentor': self.admin_id}, ['interview', 'trial', 'approve']),
            ('training', {'member': self.member_id, 'mentor': self.admin_id, 'date': '2026-11-01'}, ['complete']),
        ]
        for module, data, actions in cases:
            response = self.client.post('/api/rp/records/' + module, headers=self.admin, json={'title': 'Teste de fluxo', 'data': data})
            self.assertEqual(response.status_code, 200, response.text)
            for action in actions:
                result = self.client.post('/api/rp/actions/' + response.json()['id'], headers=self.admin, json={'action': action, 'note': 'Teste de resultado'})
                self.assertEqual(result.status_code, 200, result.text)
        history = self.client.get('/api/rp/audit', headers=self.admin).json()
        self.assertTrue(history)
        self.assertTrue(all(row['actor_id'] for row in history))
        self.assertNotIn('password_hash', str(history))
        self.assertEqual(self.client.get('/api/rp/audit', headers=self.member).status_code, 403)

    def test_rp_inbox_reports_and_operation_vehicle_lock(self):
        vehicle = self.client.post('/api/rp/records/vehicles', headers=self.admin, json={'title': 'Veículo da operação', 'data': {'plate': 'OP-001', 'owner': self.member_id, 'location': 'Base'}}).json()
        body = {'title': 'Entrega com veículo', 'data': {'category': 'Entrega', 'date': '2026-11-01', 'leader': self.admin_id, 'members': [self.member_id], 'location': 'Centro', 'vehicle': vehicle['id'], 'income': 100}}
        operation = self.client.post('/api/rp/records/operations', headers=self.admin, json=body).json()
        second = self.client.post('/api/rp/records/operations', headers=self.admin, json=body).json()
        inbox = self.client.get('/api/rp/inbox', headers=self.member).json()
        self.assertTrue(any(r['id'] == operation['id'] for r in inbox))
        action_url = '/api/rp/actions/' + operation['id']
        self.assertEqual(self.client.post(action_url, headers=self.admin, json={'action': 'start'}).status_code, 200)
        self.assertEqual(self.client.post('/api/rp/actions/' + second['id'], headers=self.admin, json={'action': 'start'}).status_code, 409)
        self.assertEqual(self.client.post('/api/rp/actions/' + vehicle['id'], headers=self.admin, json={'action': 'return'}).status_code, 409)
        completed = self.client.post(action_url, headers=self.admin, json={'action': 'complete', 'note': 'Entrega realizada'})
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(len(completed.json()['data']['_finance_ids']), 1)
        self.assertEqual(self.client.post('/api/rp/actions/' + second['id'], headers=self.admin, json={'action': 'start'}).status_code, 200)
        self.assertEqual(self.client.get('/api/rp/report?start=2026-01-01&end=2026-12-31', headers=self.member).status_code, 403)
        self.assertEqual(self.client.get('/api/rp/report?start=2026-12-31&end=2026-01-01', headers=self.admin).status_code, 422)
        report = self.client.get('/api/rp/report?start=2026-01-01&end=2026-12-31', headers=self.admin)
        self.assertEqual(report.status_code, 200)
        self.assertIn('pending', report.json()['totals'])

    def test_schedule_lifecycle_and_invalid_dates(self):
        payload = {"title": "Test payment", "amount": 10, "due_date": "2026-11-01", "members": [self.member_id]}
        self.assertEqual(self.client.post("/api/data/payment_schedule", headers=self.admin, json={**payload, "due_date": "2026-02-30"}).status_code, 422)
        created = self.client.post("/api/data/payment_schedule", headers=self.admin, json=payload).json()
        endpoint = f"/api/data/payment_schedule/{created['id']}"
        self.assertEqual(self.client.patch(endpoint, headers=self.admin, json={"title": "Updated payment"}).json()["title"], "Updated payment")
        self.assertEqual(self.client.delete(endpoint, headers=self.admin).status_code, 204)

    def test_upload_returns_usable_proof_url(self):
        proof = self.client.post("/api/uploads/finance-proofs", headers=self.admin, files={"file": ("test.pdf", b"%PDF-1.4\nTest fixture", "application/pdf")})
        self.assertEqual(proof.status_code, 200)
        proof_url = proof.json()["url"]
        self.assertEqual(self.client.get(proof_url).content, b"%PDF-1.4\nTest fixture")
        transaction = self.client.post("/api/data/finances", headers=self.admin, json={"type": "deposit", "amount": 10, "member_id": self.member_id, "proof_url": proof_url}).json()
        self.assertEqual(transaction["proof_url"], proof_url)

    def test_account_cannot_lock_itself_out(self):
        endpoint = f"/api/data/profiles/{self.admin_id}"
        self.assertEqual(self.client.patch(endpoint, headers=self.admin, json={"status": "inactive"}).status_code, 403)
        self.assertEqual(self.client.patch(endpoint, headers=self.admin, json={"role": "member"}).status_code, 403)
        self.assertEqual(self.client.delete(endpoint, headers=self.admin).status_code, 403)
        member_endpoint = f"/api/data/profiles/{self.member_id}"
        self.assertEqual(self.client.patch(member_endpoint, headers=self.admin, json={"status": "inactive"}).status_code, 200)
        try:
            response = self.client.post("/api/auth/login", json={"state_id": "test-member", "password": "isolated-member-password"})
            self.assertEqual(response.status_code, 403)
        finally:
            self.client.patch(member_endpoint, headers=self.admin, json={"status": "active"})


if __name__ == "__main__":
    unittest.main()
