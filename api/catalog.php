<?php
declare(strict_types=1);

function catalogFold(string $text): string {
    return strtolower(strtr($text, ['Á'=>'a','À'=>'a','Ã'=>'a','Â'=>'a','á'=>'a','à'=>'a','ã'=>'a','â'=>'a','É'=>'e','Ê'=>'e','é'=>'e','ê'=>'e','Í'=>'i','í'=>'i','Ó'=>'o','Ô'=>'o','Õ'=>'o','ó'=>'o','ô'=>'o','õ'=>'o','Ú'=>'u','Ü'=>'u','ú'=>'u','ü'=>'u','Ç'=>'c','ç'=>'c']));
}
function positivePage(mixed $value, int $maximum = 100000): int {
    if ((!is_string($value) && !is_int($value)) || !preg_match('/^[1-9][0-9]{0,5}$/D', (string)$value) || (int)$value > $maximum) invalid('Paginação inválida.');
    return (int)$value;
}
function verifiedCoordinates(array $stop): bool {
    foreach (['lat'=>90,'lon'=>180] as $key=>$limit) {
        if (!isset($stop[$key]) || is_bool($stop[$key]) || !is_numeric($stop[$key]) || !is_finite((float)$stop[$key]) || abs((float)$stop[$key]) > $limit) return false;
    }
    if (in_array($stop['geocoded_by']??'', ['unresolved','approximate','default_center_jitter'], true)) return false;
    $generic = abs((float)$stop['lat'] - PANAMBI_DEFAULT_LAT) < 0.0001 && abs((float)$stop['lon'] - PANAMBI_DEFAULT_LON) < 0.0001;
    return !$generic || ($stop['geocoded_by']??'') === 'manual_verified';
}
function catalogResults(array $query): array {
    $search = catalogFold(textField($query['q']??'', 300));
    $city = textField($query['city']??'',100);
    $district = textField($query['district']??'',100);
    $geo = textField($query['geocoded']??'',20);
    if (!in_array($geo,['','yes','no'],true)) invalid('Filtro de coordenadas inválido.');
    $page = positivePage($query['page']??'1');
    $limit = positivePage($query['per_page']??'20',50);
    $file = getenv('ENTREGAS_COMPANIES_FILE') ?: __DIR__.'/companies_db.json';
    $records = readDocument($file);
    $results=[]; $cities=[]; $districts=[];
    foreach ($records as $record) {
        if (!is_array($record)) throw new RuntimeException('catalog');
        $item=[];
        foreach (['nome','fantasia','codigo_sge','logradouro','numero','complemento','bairro','municipio','uf','cep'] as $key) {
            $value=$record[$key]??'';
            if (!is_string($value) && !is_int($value)) throw new RuntimeException('catalog');
            $item[$key]=(string)$value;
        }
        $item['client_id']=(string)($record['id']??$record['codigo_sge']??'');
        if ($item['client_id']==='') $item['client_id']=substr(hash('sha256',$item['nome']),0,24);
        $addressKey=implode('|',array_map(fn($key)=>catalogFold($item[$key]),['logradouro','numero','complemento','bairro','municipio','uf','cep']));
        $item['address_id']='addr_'.substr(hash('sha256',$item['client_id'].'|'.$addressKey),0,24);
        $item['id']=$item['address_id'];
        $item['lat']=$record['lat']??null; $item['lon']=$record['lon']??null;
        $item['geocoded_by']=$record['geocoded_by']??'local_db';
        $item['has_coordinates']=verifiedCoordinates($item);
        if (!$item['has_coordinates']) { $item['lat']=null; $item['lon']=null; $item['geocoded_by']='unresolved'; }
        if ($item['municipio']!=='') $cities[$item['municipio']]=true;
        if (($city==='' || $city===$item['municipio']) && $item['bairro']!=='') $districts[$item['bairro']]=true;
        if ($city!=='' && $item['municipio']!==$city) continue;
        if ($district!=='' && $item['bairro']!==$district) continue;
        if ($geo==='yes' && !$item['has_coordinates'] || $geo==='no' && $item['has_coordinates']) continue;
        if ($search!=='' && !str_contains(catalogFold(implode(' ',array_intersect_key($item,array_flip(['nome','fantasia','codigo_sge','logradouro','bairro','municipio','cep'])))), $search)) continue;
        $results[]=$item;
    }
    usort($results,fn($a,$b)=>strcmp(catalogFold($a['nome']),catalogFold($b['nome'])) ?: strcmp($a['id'],$b['id']));
    $cityList=array_keys($cities);$districtList=array_keys($districts);sort($cityList);sort($districtList);
    return ['success'=>true,'results'=>array_slice($results,($page-1)*$limit,$limit),'total'=>count($results),'page'=>$page,'per_page'=>$limit,'pages'=>max(1,(int)ceil(count($results)/$limit)), 'facets'=>['cities'=>$cityList,'districts'=>$districtList]];
}
