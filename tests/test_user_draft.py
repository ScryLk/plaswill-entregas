import unittest
import uuid
import test_api

class UserDraftTest(unittest.TestCase):
    setUpClass = classmethod(test_api.API.setUpClass.__func__)
    tearDownClass = classmethod(test_api.API.tearDownClass.__func__)
    call = test_api.API.call

    def test_unauthenticated_cannot_access_draft(self):
        self.assertEqual(self.call('/api/user_draft_read.php', identity=None)[0], 401)
        self.assertEqual(self.call('/api/user_draft_write.php', {'action': 'save'}, identity=None)[0], 401)

    def test_supervisor_cannot_write_draft(self):
        self.assertEqual(self.call('/api/user_draft_write.php', {'action': 'save'}, identity='reader')[0], 403)

    def test_save_and_read_draft(self):
        stops = [{'id': 'stop-draft-1', 'destinatario': 'Cliente Rascunho', 'logradouro': 'Rua Teste', 'municipio': 'Panambi', 'uf': 'RS', 'lat': -28.2, 'lon': -53.5, 'status': 'pending'}]
        code, write_res = self.call('/api/user_draft_write.php', {'action': 'save', 'stops': stops})
        self.assertEqual(code, 200)
        self.assertTrue(write_res['success'])
        self.assertEqual(write_res['total_stops'], 1)

        code, read_res = self.call('/api/user_draft_read.php')
        self.assertEqual(code, 200)
        self.assertTrue(read_res['success'])
        self.assertIsNotNone(read_res['draft'])
        self.assertEqual(len(read_res['draft']['stops']), 1)
        self.assertEqual(read_res['draft']['stops'][0]['destinatario'], 'Cliente Rascunho')

        # Clear draft
        code, clear_res = self.call('/api/user_draft_write.php', {'action': 'clear'})
        self.assertEqual(code, 200)
        self.assertTrue(clear_res['cleared'])

        code, read_res2 = self.call('/api/user_draft_read.php')
        self.assertEqual(code, 200)
        self.assertIsNone(read_res2['draft'])

    def test_save_route_creates_routine_with_actor(self):
        stops = [{'id': 'stop-dispatch-1', 'destinatario': 'Cliente Despacho', 'logradouro': 'Rua Despacho', 'municipio': 'Panambi', 'uf': 'RS', 'lat': -28.2, 'lon': -53.5, 'status': 'pending'}]
        op = str(uuid.uuid4())
        code, route_res = self.call('/api/save_route.php', {'stops': stops, 'operation_id': op})
        self.assertEqual(code, 200)
        rid = route_res['route_id']

        # Verify route document contains created_by
        code, view = self.call('/api/get_route.php?r=' + rid)
        self.assertEqual(code, 200)
        self.assertEqual(view['route']['created_by'], 'synthetic')
        self.assertTrue(view['route']['routine_id'].startswith('RUT-'))

        # Verify routine was created and appears in routine_read.php
        code, routine_view = self.call('/api/routine_read.php?id=' + view['route']['routine_id'])
        self.assertEqual(code, 200)
        self.assertEqual(routine_view['routine']['created_by'], 'synthetic')
        self.assertEqual(routine_view['routine']['route_id'], rid)
        self.assertEqual(routine_view['routine']['status'], 'dispatched')

        # Verify searching by actor finds the routine
        code, listing = self.call('/api/routine_read.php?q=synthetic')
        self.assertEqual(code, 200)
        self.assertTrue(any(r['routine_id'] == view['route']['routine_id'] for r in listing['results']))

if __name__ == '__main__':
    unittest.main()
