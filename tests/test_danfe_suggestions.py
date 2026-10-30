"""Synthetic tests for the post-provider DANFE normalization, with no network/auth bypass in product."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('ENTREGAS_PHP_BIN', 'php')


class DanfeSuggestions(unittest.TestCase):
    def normalize(self, extracted, companies=None, geo=None):
        # Exercise the real response normalization after Gemini; provider/I/O are deliberately excluded.
        source = (ROOT/'api/process_danfe.php').read_text()
        tail = source[source.index('$geminiData = json_decode($response, true);'):]
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            (directory/'companies_db.json').write_text(json.dumps(companies or []))
            helper=ROOT/'api/danfe_delivery.php'
            if helper.exists(): shutil.copyfile(helper,directory/helper.name)
            fixture = json.dumps({'extracted':extracted,'geo':geo})
            script = '''<?php
            const PANAMBI_DEFAULT_LAT=-28.2917; const PANAMBI_DEFAULT_LON=-53.5019;
            $fixture=json_decode(stream_get_contents(STDIN),true);
            function jsonResponse(array $data,int $status=200): never { echo json_encode(['status'=>$status,'data'=>$data]);exit; }
            function geocodeAddress(string $q,string $city,string $uf): ?array { return $GLOBALS['fixture']['geo']; }
            $response=json_encode(['candidates'=>[['content'=>['parts'=>[['text'=>json_encode($fixture['extracted'])]]]]]]);
            '''+tail
            (directory/'normalize.php').write_text(script)
            result=subprocess.run([PHP,str(directory/'normalize.php')],input=fixture,text=True,capture_output=True,check=True,
                env=dict(os.environ,ENTREGAS_COMPANIES_FILE=str(directory/'companies_db.json')))
            return json.loads(result.stdout)

    def extracted(self, **extra):
        return {'destinatario':'Synthetic Recipient','endereco':{'logradouro':'Synthetic Street','numero':'20','municipio':'Synthetic City','uf':'RS'},**extra}

    def test_missing_geocode_does_not_invent_location(self):
        result=self.normalize(self.extracted())
        self.assertEqual(result['status'],200)
        self.assertIsNone(result['data']['delivery']['lat'])
        self.assertIsNone(result['data']['delivery']['lon'])
        self.assertEqual(result['data']['delivery']['geocoded_by'],'unresolved')

    def test_similar_name_different_address_does_not_reuse_company_coordinates(self):
        company={'nome':'Synthetic Recipient','logradouro':'Other street','numero':'99','municipio':'Other city','uf':'RS','lat':-28.2,'lon':-53.5}
        result=self.normalize(self.extracted(),[company])
        self.assertIsNone(result['data']['delivery']['lat'])

    def test_malformed_ai_fields_are_rejected_consistently(self):
        for payload in [self.extracted(destinatario=['unexpected']), self.extracted(endereco='not an address'),self.extracted(numero_nota={'unexpected':True})]:
            with self.subTest(payload=payload):
                result=self.normalize(payload)
                self.assertEqual(result['status'],422)
                self.assertNotIn('delivery',result['data'])

    def test_geocoded_result_remains_an_ai_suggestion_for_review(self):
        result=self.normalize(self.extracted(),geo={'lat':-28.2,'lon':-53.5,'display_name':'Synthetic geocoder'})
        self.assertTrue(result['data']['delivery'].get('needs_review'))
        self.assertEqual(result['data']['delivery'].get('source'),'danfe_ai')

    def test_missing_address_is_not_assigned_a_default_city(self):
        result=self.normalize({'destinatario':'Synthetic Recipient'})
        self.assertEqual(result['data']['delivery']['municipio'],'')
        self.assertEqual(result['data']['delivery']['uf'],'')

    def test_exact_name_and_address_can_reuse_valid_catalog_coordinates(self):
        company={'nome':'Synthetic Recipient','logradouro':'Synthetic Street','numero':'20','municipio':'Synthetic City','uf':'RS','lat':-28.2,'lon':-53.5}
        result=self.normalize(self.extracted(),[company])
        self.assertEqual(result['data']['delivery']['lat'],-28.2)
        self.assertEqual(result['data']['delivery']['geocoded_by'],'local_db')
        self.assertTrue(result['data']['delivery']['needs_review'])

