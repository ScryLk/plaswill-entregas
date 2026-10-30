"""Driver ownership and revoked-access regression; isolated synthetic store."""
import os
import subprocess
import unittest
import test_api


class PWA(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)

    @unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in PWA Chromium regression')
    def test_browser_multitab_and_revoked_access(self):
        subprocess.run(['node',str(test_api.ROOT/'tests/pwa-browser.cjs')],cwd=test_api.ROOT,
            env=dict(os.environ,TEST_BASE=self.origin),check=True,timeout=90)
