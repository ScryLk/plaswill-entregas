import concurrent.futures
import unittest
import uuid
import test_api

class LegacyIdempotency(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)
    call=test_api.API.call

    def test_retry_after_lost_response_allocates_one_route(self):
        body={'operation_id':str(uuid.uuid4()),'stops':[{'id':'synthetic','lat':-28.2,'lon':-53.5,'status':'pending'}]}
        before=len(list((self.data/'routes').glob('*.json'))) if (self.data/'routes').exists() else 0
        with concurrent.futures.ThreadPoolExecutor() as pool:
            results=list(pool.map(lambda _:self.call('/api/save_route.php',body),range(3)))
        self.assertTrue(all(code==200 for code,_ in results))
        self.assertEqual(len({r['route_id'] for _,r in results}),1)
        self.assertEqual(len(list((self.data/'routes').glob('*.json'))),before+1)
        self.assertEqual(sum(bool(r['share_url']) for _,r in results),1)
        self.assertEqual(self.call('/api/save_route.php',body|{'motorista':'Different payload'})[0],409)
        rid=results[0][1]['route_id']
        self.assertNotIn('_create',self.call('/api/get_route.php?r='+rid)[1]['route'])

    def test_invalid_operation_does_not_create_route(self):
        self.assertEqual(self.call('/api/save_route.php',{'operation_id':'bad','stops':[{'id':'synthetic','lat':-28.2,'lon':-53.5}]})[0],400)

    def test_absent_driver_and_vehicle_are_not_invented(self):
        _,created=self.call('/api/save_route.php',{'stops':[{'id':'synthetic','lat':-28.2,'lon':-53.5}]})
        _,view=self.call('/api/get_route.php?r='+created['route_id'])
        self.assertEqual(view['route']['motorista'],'')
        self.assertEqual(view['route']['veiculo'],'')
