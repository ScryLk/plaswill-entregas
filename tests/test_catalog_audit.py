"""Synthetic catalogue compatibility and real-browser form regression."""
import os
import subprocess
import unittest
import test_api

class CatalogAudit(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)
    call=test_api.API.call

    def test_legacy_search_preserves_source_without_sensitive_fields(self):
        for path in ['/api/search_company.php','/api/search_company.php?q=Synthetic']:
            code,data=self.call(path)
            self.assertEqual(code,200)
            item=data['results'][0]
            self.assertEqual(item['source'],'corporate_catalog')
            self.assertTrue(item['client_id'])
            self.assertTrue(item['address_id'])
            self.assertNotIn('cnpj',item)
            self.assertNotIn('telefone',item)

    @unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in catalogue Chromium regression')
    def test_browser_catalog_forms(self):
        subprocess.run(['node',str(test_api.ROOT/'tests/catalog-browser.cjs')],cwd=test_api.ROOT,
            env=dict(os.environ,TEST_BASE=self.origin),check=True,timeout=60)
