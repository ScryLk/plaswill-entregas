"""Exercise the real geocoder with a local HTTPS stream fixture; no network traffic."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
PHP=os.environ.get('ENTREGAS_PHP_BIN','php')


class GeocodePrecision(unittest.TestCase):
    def geocode(self, query, street_hit=False):
        source=(ROOT/'api/config.php').read_text()
        function=source[source.index('function geocodeAddress('):]
        with tempfile.TemporaryDirectory() as directory:
            script=Path(directory)/'geocode.php'
            script.write_text('''<?php
            const PANAMBI_DEFAULT_LAT=-28.2917;const PANAMBI_DEFAULT_LON=-53.5019;
            $fixture=json_decode(stream_get_contents(STDIN),true);
            class SyntheticNominatim {
                public $context;
                private string $body='';private int $offset=0;
                public function stream_open($path,$mode,$options,&$opened_path):bool {
                    parse_str(parse_url($path,PHP_URL_QUERY),$params);
                    $GLOBALS['queries'][]=$params;
                    $cityOnly=!isset($params['street'])&&(!isset($params['q'])||$params['q']==='Panambi, RS, Brasil');
                    if($cityOnly)$record=['lat'=>-28.2917,'lon'=>-53.5019,'display_name'=>'Synthetic city centroid'];
                    elseif($GLOBALS['fixture']['street_hit']&&isset($params['street']))$record=['lat'=>-28.21,'lon'=>-53.41,'display_name'=>'Synthetic address match'];
                    else $record=null;
                    $this->body=json_encode($record?[$record]:[]);return true;
                }
                public function stream_read($count):string {$chunk=substr($this->body,$this->offset,$count);$this->offset+=strlen($chunk);return $chunk;}
                public function stream_eof():bool {return $this->offset>=strlen($this->body);}
                public function stream_stat():array {return [];}
            }
            stream_wrapper_unregister('https');stream_wrapper_register('https',SyntheticNominatim::class);
            $queries=[];
            '''+function+'''
            $result=geocodeAddress($fixture['query'],'Panambi','RS');
            echo json_encode(['result'=>$result,'queries'=>$queries]);
            ''')
            process=subprocess.run([PHP,str(script)],input=json.dumps({'query':query,'street_hit':street_hit}),text=True,capture_output=True,check=True)
            return json.loads(process.stdout)

    def test_missing_street_never_substitutes_or_shifts_city_centroid(self):
        result=self.geocode('Synthetic unknown street, 19')
        self.assertIsNone(result['result'],'A missing street must remain unresolved, even if the city centroid exists')
        self.assertTrue(result['queries'])
        self.assertTrue(all('street' in q or q.get('q')!='Panambi, RS, Brasil' and 'q' in q for q in result['queries']))

    def test_existing_street_alias_normalization_is_preserved(self):
        result=self.geocode('Rua Gal. Osorio, 19',street_hit=True)
        self.assertEqual(result['result']['lat'],-28.21)
        self.assertEqual(result['queries'][0]['street'],'Rua General Osório, 19')

    def test_highway_without_address_match_remains_unresolved(self):
        result=self.geocode('Rodovia BR 285 - KM 445, S/N, Interior')
        self.assertIsNone(result['result'])
        self.assertTrue(any(q.get('street')=='BR-285' for q in result['queries']))
