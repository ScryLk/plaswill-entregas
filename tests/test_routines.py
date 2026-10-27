"""Routine lifecycle, pagination, authorization and crash recovery on synthetic data."""
import concurrent.futures
import json
import os
import subprocess
import unittest
import uuid
import test_api

class Routines(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)
    call=test_api.API.call

    def create(self,**extra):
        body={'action':'create','operation_id':str(uuid.uuid4()),'name':'Synthetic Routine','scheduled_date':'2026-10-26',**extra}
        code,result=self.call('/api/routine_write.php',body)
        self.assertEqual(code,200,result)
        return result['routine'],body

    def stop(self,id='synthetic-delivery',**extra):
        return {'id':id,'client_id':'synthetic-company','address_id':'synthetic-address','destinatario':'Synthetic Customer',
                'logradouro':'Synthetic Street','numero':'1','municipio':'Synthetic City','uf':'RS',
                'lat':-28.2,'lon':-53.5,'status':'pending',**extra}

    def save(self,r,stops=None,**extra):
        body={key:r[key] for key in ['name','scheduled_date','origin','motorista','veiculo','notes']}
        body.update(action='update',routine_id=r['routine_id'],expected_version=r['version'],operation_id=str(uuid.uuid4()),
                    status=r['status'],stops=r['stops'] if stops is None else stops)
        body.update(extra)
        code,result=self.call('/api/routine_write.php',body)
        self.assertEqual(code,200,result)
        return result['routine'],body

    def read(self,id,**kwargs):
        return self.call('/api/routine_read.php?id='+id,**kwargs)

    def dispatch(self,r):
        return self.call('/api/routine_write.php',{'action':'dispatch','routine_id':r['routine_id'],'expected_version':r['version']})

    def test_empty_drafts_metadata_persistence_and_same_date(self):
        a,body=self.create();b,_=self.create()
        self.assertNotEqual(a['routine_id'],b['routine_id']);self.assertEqual(a['status'],'draft')
        self.assertEqual(a['stops'],[]);self.assertIsNone(a['route_id']);self.assertEqual(a['created_by'],'synthetic')
        self.assertNotIn('_create',a);self.assertNotIn('share_url',a)
        self.assertEqual(self.call('/api/routine_write.php',body)[1]['routine']['routine_id'],a['routine_id'])
        conflict=body|{'name':'Different retry'}
        self.assertEqual(self.call('/api/routine_write.php',conflict)[0],409)
        a,_=self.save(a,notes='Saved metadata',motorista='Synthetic Driver',veiculo='Synthetic Vehicle')
        self.assertEqual(self.read(a['routine_id'])[1]['routine']['notes'],'Saved metadata')
        _,listing=self.call('/api/routine_read.php?from=2026-10-26&to=2026-10-26&status=draft&per_page=1')
        self.assertGreaterEqual(listing['total'],2);self.assertEqual(len(listing['results']),1)
        self.assertNotIn('stops',listing['results'][0])
        self.assertGreaterEqual(self.call('/api/routine_read.php?q=26%2F10%2F2026')[1]['total'],2)

    def test_deliveries_snapshot_duplicates_edit_order_and_versions(self):
        r,_=self.create()
        r,body=self.save(r,[self.stop('a',numero_nota='NF-A'),self.stop('b',numero_nota='NF-B',volumes=3)])
        self.assertEqual(r['total_stops'],2);self.assertEqual(r['destinations'],1)
        self.assertEqual(self.call('/api/routine_write.php',body)[1]['routine']['version'],r['version'])
        # Same address can have two deliveries, but delivery IDs themselves must be unique.
        invalid=body|{'operation_id':str(uuid.uuid4()),'expected_version':r['version'],'stops':[self.stop('same'),self.stop('same')]}
        self.assertEqual(self.call('/api/routine_write.php',invalid)[0],400)
        r,_=self.save(r,list(reversed(r['stops'])))
        self.assertEqual(r['stops'][0]['id'],'b')
        r,_=self.save(r,[r['stops'][0]|{'logradouro':'Corrected Synthetic Street'}])
        _,value=self.read(r['routine_id']);self.assertEqual(value['routine']['stops'][0]['logradouro'],'Corrected Synthetic Street')
        r,_=self.save(r,status='planned');self.assertEqual(r['status'],'planned')
        stale=body|{'operation_id':str(uuid.uuid4())}
        self.assertEqual(self.call('/api/routine_write.php',stale)[0],409)

    def test_concurrent_updates_detect_conflict(self):
        r,_=self.create();r,body=self.save(r,[self.stop()])
        def change(note):return self.call('/api/routine_write.php',body|{'operation_id':str(uuid.uuid4()),'expected_version':r['version'],'notes':note})
        with concurrent.futures.ThreadPoolExecutor() as pool:results=list(pool.map(change,['one','two']))
        self.assertEqual(sorted(code for code,_ in results),[200,409])
        self.assertIn(self.read(r['routine_id'])[1]['routine']['notes'],['one','two'])

    def test_dispatch_is_idempotent_and_lifecycle_tracks_driver(self):
        r,_=self.create();r,_=self.save(r,[self.stop('a'),self.stop('b',numero_nota='NF-B')])
        before=len(list((self.data/'routes').glob('ROT-*.json')))
        with concurrent.futures.ThreadPoolExecutor() as pool:responses=list(pool.map(lambda _:self.dispatch(r),range(3)))
        self.assertTrue(all(code==200 for code,_ in responses),responses)
        ids={value['route_id'] for _,value in responses};self.assertEqual(len(ids),1)
        self.assertEqual(len(list((self.data/'routes').glob('ROT-*.json'))),before+1)
        initial=next(value for _,value in responses if value['share_url'])
        self.assertEqual(initial['routine']['dispatched_by'],'synthetic')
        token=initial['share_url'].split('#token=')[1];rid=initial['route_id']
        self.assertEqual(self.call('/api/get_route.php?r='+rid,identity=None,token=token)[0],200)
        self.assertNotIn('_dispatch_actor',self.call('/api/get_route.php?r='+rid,identity=None,token=token)[1]['route'])
        self.assertEqual(self.read(r['routine_id'],identity=None,token=token)[0],401)
        body={'route_id':rid,'stop_id':'a','status':'delivered','operation_id':str(uuid.uuid4()),'expected_version':0}
        self.assertEqual(self.call('/api/update_route_status.php',body,identity=None,token=token)[0],200)
        view=self.read(r['routine_id'])[1]['routine']
        self.assertEqual(view['status'],'in_progress');self.assertEqual(view['delivered_stops'],1)
        structural={'action':'update','routine_id':r['routine_id']}
        self.assertEqual(self.call('/api/routine_write.php',structural)[0],409)
        self.assertEqual(self.call('/api/finish_route.php',{'route_id':rid},identity=None,token=token)[0],200)
        view=self.read(r['routine_id'])[1]['routine'];self.assertEqual(view['status'],'finished');self.assertEqual(view['pending_stops'],1)
        _,history=self.call('/api/get_history.php');self.assertTrue(any(row['route_id']==rid for row in history['history']))
        self.assertEqual(self.call('/api/routine_write.php',{'action':'cancel','routine_id':r['routine_id'],'expected_version':view['version'],'reason':'Test'})[0],409)

    def test_interrupted_dispatch_recovers_without_second_route(self):
        r,_=self.create();r,_=self.save(r,[self.stop()]);directory=self.data/'routines'
        before=len(list((self.data/'routes').glob('ROT-*.json')))
        directory.chmod(0o500)
        try:self.assertEqual(self.dispatch(r)[0],500)
        finally:directory.chmod(0o700)
        code,result=self.dispatch(r)
        self.assertEqual(code,200,result);self.assertTrue(result['replayed']);self.assertIsNone(result['share_url'])
        self.assertEqual(len(list((self.data/'routes').glob('ROT-*.json'))),before+1)
        self.assertEqual(self.read(r['routine_id'])[1]['routine']['route_id'],result['route_id'])

    def test_cancellation_retains_data_and_revokes_access(self):
        r,_=self.create();r,_=self.save(r,[self.stop()]);_,result=self.dispatch(r)
        token=result['share_url'].split('#token=')[1];rid=result['route_id'];r=result['routine']
        self.assertEqual(self.call('/api/update_route_status.php',{'route_id':rid,'stop_id':'synthetic-delivery','status':'delivered'})[0],200)
        cancel={'action':'cancel','routine_id':r['routine_id'],'expected_version':r['version'],'reason':'Synthetic vehicle unavailable'}
        code,data=self.call('/api/routine_write.php',cancel);self.assertEqual(code,200,data)
        self.assertEqual(data['routine']['status'],'cancelled');self.assertEqual(data['routine']['total_stops'],1);self.assertEqual(data['routine']['delivered_stops'],1)
        self.assertEqual(data['routine']['cancelled_by'],'synthetic')
        self.assertEqual(self.call('/api/routine_write.php',cancel)[0],200)
        self.assertEqual(self.call('/api/get_route.php?r='+rid,identity=None,token=token)[0],403)
        self.assertEqual(self.call('/api/update_route_status.php',{'route_id':rid,'stop_id':'synthetic-delivery','status':'delivered'})[0],409)
        self.assertEqual(self.call('/api/finish_route.php',{'route_id':rid})[0],409)
        self.assertEqual(self.call('/api/issue_route_access.php',{'route_id':rid})[0],409)
        self.assertEqual(self.dispatch(r)[0],409)
        self.assertTrue((self.data/'routes'/(rid+'.json')).exists())
        draft,_=self.create();code,result=self.call('/api/routine_write.php',{'action':'cancel','routine_id':draft['routine_id'],'expected_version':0,'reason':'Synthetic cancellation'})
        self.assertEqual(code,200);self.assertEqual(result['routine']['status'],'cancelled')

    def test_interrupted_cancellation_and_corrupted_routine(self):
        r,_=self.create();r,_=self.save(r,[self.stop()]);_,result=self.dispatch(r)
        r=result['routine'];token=result['share_url'].split('#token=')[1]
        body={'action':'cancel','routine_id':r['routine_id'],'expected_version':r['version'],'reason':'Synthetic interrupted cancellation'}
        directory=self.data/'routines';directory.chmod(0o500)
        try:self.assertEqual(self.call('/api/routine_write.php',body)[0],500)
        finally:directory.chmod(0o700)
        repaired=self.read(r['routine_id'])[1]['routine']
        self.assertEqual(repaired['status'],'cancelled');self.assertEqual(repaired['cancellation_reason'],body['reason'])
        self.assertEqual(self.call('/api/get_route.php?r='+r['route_id'],identity=None,token=token)[0],403)
        path=directory/(r['routine_id']+'.json');original=path.read_bytes();path.write_text('{')
        try:self.assertEqual(self.read(r['routine_id'])[0],500);self.assertEqual(path.read_text(),'{')
        finally:path.write_bytes(original)

    def test_invalid_inputs_and_permissions(self):
        self.assertEqual(self.call('/api/routine_read.php',identity=None)[0],401)
        self.assertEqual(self.call('/api/routine_write.php',{'action':'create'},identity=None)[0],401)
        self.assertEqual(self.call('/api/routine_write.php',{'action':'create'},identity='reader')[0],403)
        r,_=self.create();self.assertEqual(self.read(r['routine_id'],identity='reader')[0],200)
        self.assertEqual(self.call('/api/search_company.php?mode=catalog',identity='reader')[0],403)
        self.assertEqual(self.read('../invalid')[0],400)
        for date in ['2026-02-30','not-date']:
            self.assertEqual(self.call('/api/routine_write.php',{'action':'create','operation_id':str(uuid.uuid4()),'scheduled_date':date})[0],400)
        self.assertEqual(self.dispatch(r)[0],400)
        r,_=self.save(r,[self.stop(lat=None,lon=None)])
        self.assertEqual(self.dispatch(r)[0],400)
        self.assertEqual(self.call('/api/routine_write.php',{'action':'update','routine_id':r['routine_id'],'expected_version':r['version'],'operation_id':str(uuid.uuid4()),'scheduled_date':r['scheduled_date'],'stops':r['stops'],'status':'dispatched'})[0],400)
        for path in ['/api/routines.php','/api/catalog.php','/data/routines/'+r['routine_id']+'.json']:
            self.assertEqual(self.call(path)[0],404)
        self.assertEqual(self.call('/api/routine_read.php?status=unknown')[0],400)
        self.assertEqual(self.call('/api/routine_read.php?from=2026-10-27&to=2026-10-26')[0],400)

    def test_catalog_filters_pagination_no_sensitive_fields(self):
        file=self.data.parent/'companies.json';original=file.read_bytes()
        records=[]
        for i in range(55):
            records.append({'id':str(i),'codigo_sge':f'CODE-{i:03}','nome':f'Synthetic {i:03}',
                'fantasia':'Synthetic Trade','logradouro':'Synthetic Street','numero':str(i),'bairro':'North' if i%2 else 'South',
                'municipio':'City A' if i<30 else 'City B','cep':'12345-678','uf':'RS',
                'lat':None if i%2 else -28.2,'lon':None if i%2 else -53.5,
                'cnpj':'SENSITIVE-EXCLUDED','telefone':'EXCLUDED'})
        file.write_text(json.dumps(records))
        try:
            code,a=self.call('/api/search_company.php?mode=catalog&page=1&per_page=10');self.assertEqual(code,200)
            _,b=self.call('/api/search_company.php?mode=catalog&page=2&per_page=10')
            self.assertEqual(a['total'],55);self.assertEqual(len(a['results']),10)
            self.assertTrue(set(x['id'] for x in a['results']).isdisjoint(x['id'] for x in b['results']))
            self.assertNotIn('cnpj',a['results'][0]);self.assertNotIn('telefone',a['results'][0])
            _,filtered=self.call('/api/search_company.php?mode=catalog&city=City%20A&district=North&geocoded=no')
            self.assertEqual(filtered['total'],15);self.assertTrue(all(not x['has_coordinates'] for x in filtered['results']))
            _,found=self.call('/api/search_company.php?mode=catalog&q=CODE-054')
            self.assertEqual(found['total'],1)
            self.assertEqual(self.call('/api/search_company.php?mode=catalog&per_page=100')[0],400)
        finally:file.write_bytes(original)

    @unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in routine Chromium regression')
    def test_browser_routine_module(self):
        file=self.data.parent/'companies.json';original=file.read_bytes()
        records=[]
        for name,city,district,lat,lon in [('Alpha','City A','Centro',-28.2,-53.5),('Beta','City A','Industrial',-28.22,-53.51),('Gamma','City B','Centro',None,None)]:
            records.append({'id':name,'nome':name,'fantasia':name+' Trade','logradouro':'Synthetic Street '+name,'numero':'1','bairro':district,'municipio':city,'uf':'RS','lat':lat,'lon':lon})
        for i in range(21):records.append({'id':'extra-'+str(i),'nome':f'Extra {i:02}','logradouro':'Synthetic Extra Street','municipio':'City A','uf':'RS','lat':-28.2,'lon':-53.5})
        file.write_text(json.dumps(records))
        try:
            subprocess.run(['node',str(test_api.ROOT/'tests/routines-browser.cjs')],cwd=test_api.ROOT,
                env=dict(os.environ,TEST_BASE=self.origin),check=True,timeout=120)
        finally:file.write_bytes(original)


class HistoryContext(unittest.TestCase):
    # Separate temporary store: the routine UI scenario starts with an empty list.
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)

    @unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in history Chromium regression')
    def test_browser_history_context(self):
        subprocess.run(['node',str(test_api.ROOT/'tests/history-browser.cjs')],cwd=test_api.ROOT,
            env=dict(os.environ,TEST_BASE=self.origin),check=True,timeout=60)
