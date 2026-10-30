"""Synthetic persistence and acknowledgement regressions, never production data."""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time
import unittest
import urllib.request
import uuid
import test_api

class PersistenceAudit(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)

    @unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in persistence Chromium regression')
    def test_browser_acknowledgement_and_recovery(self):
        subprocess.run(['node',str(test_api.ROOT/'tests/persistence-browser.cjs')],cwd=test_api.ROOT,
            env=dict(os.environ,TEST_BASE=self.origin),check=True,timeout=90)


class StorageLifecycle(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)
    call=test_api.API.call

    def stop_worker(self):
        os.killpg(self.__class__.proc.pid,signal.SIGTERM)
        self.__class__.proc.wait(timeout=10)

    def start_worker(self,checkout,data):
        router=Path(self.tmp.name)/'lifecycle-router.php'
        router.write_text("<?php if (($_SERVER['HTTP_X_TEST_IDENTITY']??'')==='operator') { $_SERVER['REMOTE_USER']='synthetic'; $_SERVER['REMOTE_GROUPS']='test-dispatch'; } return require "+repr(str(checkout/'router.php'))+';')
        env=dict(os.environ,GED_AUTH_TYPE='gateway',GEMINI_API_KEY='',ENTREGAS_DATA_DIR=str(data),
            ENTREGAS_PUBLIC_ORIGIN=self.origin,ENTREGAS_ROLE_GROUPS='{"operator":["test-dispatch"]}',
            ENTREGAS_COMPANIES_FILE=str(Path(self.tmp.name)/'companies.json'),PHP_CLI_SERVER_WORKERS='4')
        self.__class__.proc=subprocess.Popen([test_api.PHP,'-S',f'127.0.0.1:{self.port}',str(router)],
            cwd=checkout,env=env,stdout=self.log,stderr=self.log,start_new_session=True)
        for _ in range(100):
            try:
                urllib.request.urlopen(self.origin+'/api/auth_session.php',timeout=.2).close();return
            except OSError:time.sleep(.05)
        raise RuntimeError('Isolated PHP worker did not restart')

    def test_restart_code_update_and_backup_restore_preserve_documents(self):
        code,result=self.call('/api/routine_write.php',{'action':'create','operation_id':str(uuid.uuid4()),
            'name':'Synthetic lifecycle','scheduled_date':'2026-10-30',
            'origin':{'name':'Synthetic origin','lat':-28.2,'lon':-53.5}})
        self.assertEqual(code,200,result);routine=result['routine'];rid=routine['routine_id']
        stop={'id':'synthetic-persisted-stop','status':'pending','destinatario':'Synthetic customer',
            'logradouro':'Synthetic street','municipio':'Synthetic city','uf':'RS','lat':-28.2,'lon':-53.5}
        body={key:routine[key] for key in ['name','scheduled_date','origin','motorista','veiculo','notes']}
        body.update(action='update',routine_id=rid,expected_version=routine['version'],operation_id=str(uuid.uuid4()),status='draft',stops=[stop])
        code,result=self.call('/api/routine_write.php',body);self.assertEqual(code,200,result)
        path=self.data/'routines'/(rid+'.json');saved=path.read_bytes()
        self.stop_worker();self.start_worker(test_api.ROOT,self.data)
        code,result=self.call('/api/routine_read.php?id='+rid);self.assertEqual(code,200,result)
        self.assertEqual(result['routine']['stops'][0]['id'],stop['id']);self.assertEqual(path.read_bytes(),saved)
        # A new code directory contains only backend code; no corporate catalogue or live data.
        release=Path(self.tmp.name)/'synthetic-release';(release/'api').mkdir(parents=True)
        for source in (test_api.ROOT/'api').glob('*.php'):shutil.copy2(source,release/'api'/source.name)
        shutil.copy2(test_api.ROOT/'router.php',release/'router.php')
        self.stop_worker();self.start_worker(release,self.data)
        code,result=self.call('/api/routine_read.php?id='+rid);self.assertEqual(code,200,result)
        self.assertEqual(result['routine']['stops'][0]['id'],stop['id']);self.assertEqual(path.read_bytes(),saved)
        # Backup is taken with writers stopped and restored into a separate synthetic directory.
        self.stop_worker();backup=Path(self.tmp.name)/'synthetic-backup';shutil.copytree(self.data,backup)
        path.write_text('{')
        restored=Path(self.tmp.name)/'synthetic-restored';shutil.copytree(backup,restored)
        self.start_worker(release,restored)
        code,result=self.call('/api/routine_read.php?id='+rid);self.assertEqual(code,200,result)
        self.assertEqual(result['routine']['stops'][0]['id'],stop['id'])
        self.assertEqual((restored/'routines'/(rid+'.json')).read_bytes(),saved)
        self.assertEqual(path.read_text(),'{','Restore rehearsal must not silently rewrite the source')
