import os
import subprocess
import unittest
import test_api

@unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in initialization Chromium regression')
class Initialization(unittest.TestCase):
    setUpClass=classmethod(test_api.API.setUpClass.__func__)
    tearDownClass=classmethod(test_api.API.tearDownClass.__func__)

    def run_case(self,case):
        subprocess.run(['node',str(test_api.ROOT/'tests/initialization-browser.cjs')],cwd=test_api.ROOT,
            env=dict(os.environ,TEST_BASE=self.origin,TEST_CASE=case),check=True,timeout=45)

    def test_empty_session_has_no_demonstration_deliveries(self):self.run_case('empty')
    def test_corrupt_local_cache_is_preserved(self):self.run_case('corrupt')
    def test_failed_route_lookup_preserves_cache_without_showing_other_route(self):self.run_case('failed-route')
    def test_legacy_dispatch_retry_survives_lost_response_and_reload(self):self.run_case('legacy-retry')
    def test_legacy_async_operations_preserve_context(self):self.run_case('legacy-context')
    def test_optimizer_ignores_stale_results_and_fallbacks(self):self.run_case('optimizer-context')
    def test_archive_ignores_result_after_context_change(self):self.run_case('archive-context')
    def test_failure_of_local_storage_is_visible_and_preserves_memory(self):self.run_case('quota')
    def test_failure_of_finish_confirmation_preserves_active_data(self):self.run_case('finish-ack')
