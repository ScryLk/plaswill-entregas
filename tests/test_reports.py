"""Authoritative printed documents on an isolated synthetic store."""
import os
import subprocess
import unittest
import test_api


@unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in reports Chromium regression')
class Reports(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)

    def test_documents_match_server_and_never_invent_identity(self):
        subprocess.run(['node',str(test_api.ROOT/'tests/reports-browser.cjs')],cwd=test_api.ROOT,
            env=dict(os.environ,TEST_BASE=self.origin),check=True,timeout=90)
