<?php
declare(strict_types=1);

/** Gemini output is an untrusted suggestion, never a corporate registration update. */
function danfeText(mixed $value, int $limit = 500): string {
    if ($value === null) return '';
    if (!is_string($value) && !is_int($value)) throw new InvalidArgumentException('field');
    $text=trim((string)$value);
    if (strlen($text)>$limit || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$text)) throw new InvalidArgumentException('field');
    return $text;
}
function danfeFold(string $text): string {
    return strtolower(preg_replace('/\s+/u',' ',strtr(trim($text),['Á'=>'a','À'=>'a','Ã'=>'a','Â'=>'a','á'=>'a','à'=>'a','ã'=>'a','â'=>'a','É'=>'e','Ê'=>'e','é'=>'e','ê'=>'e','Í'=>'i','í'=>'i','Ó'=>'o','Ô'=>'o','Õ'=>'o','ó'=>'o','ô'=>'o','õ'=>'o','Ú'=>'u','Ü'=>'u','ú'=>'u','ü'=>'u','Ç'=>'c','ç'=>'c'])));
}
function danfeCoordinates(array $value): bool {
    foreach (['lat'=>90,'lon'=>180] as $key=>$limit) {
        if (!isset($value[$key]) || is_bool($value[$key]) || !is_numeric($value[$key]) || !is_finite((float)$value[$key]) || abs((float)$value[$key])>$limit) return false;
    }
    if (in_array($value['geocoded_by']??'', ['unresolved','approximate','default_center_jitter'],true)) return false;
    return !(abs((float)$value['lat']-PANAMBI_DEFAULT_LAT)<0.0001 && abs((float)$value['lon']-PANAMBI_DEFAULT_LON)<0.0001);
}
function danfeDelivery(mixed $extracted, array $companies, callable $geocode): array {
    if (!is_array($extracted) || array_is_list($extracted)) throw new InvalidArgumentException('response');
    $address=$extracted['endereco']??[];
    if (!is_array($address) || ($address!==[] && array_is_list($address))) throw new InvalidArgumentException('address');
    $delivery=[];
    foreach (['destinatario','nome_fantasia','numero_nota','serie','emitente','cnpj_destinatario','itens_resumo','observacoes_entrega'] as $key) {
        $target=match($key){'cnpj_destinatario'=>'cnpj','observacoes_entrega'=>'observacoes',default=>$key};
        $delivery[$target]=danfeText($extracted[$key]??'',in_array($key,['itens_resumo','observacoes_entrega'],true)?2000:500);
    }
    if ($delivery['destinatario']==='') throw new InvalidArgumentException('recipient');
    if ($delivery['nome_fantasia']==='') $delivery['nome_fantasia']=$delivery['destinatario'];
    foreach (['logradouro','numero','complemento','bairro','municipio','uf','cep'] as $key) $delivery[$key]=danfeText($address[$key]??'');
    $delivery['uf']=strtoupper($delivery['uf']);
    if ($delivery['uf']!=='' && !preg_match('/^[A-Z]{2}$/D',$delivery['uf'])) throw new InvalidArgumentException('uf');
    if (isset($extracted['volumes'])) {
        if (!is_int($extracted['volumes']) || $extracted['volumes']<0 || $extracted['volumes']>100000) throw new InvalidArgumentException('volumes');
        $delivery['volumes']=$extracted['volumes'];
    }
    $delivery+=['id'=>'del_'.bin2hex(random_bytes(16)),'lat'=>null,'lon'=>null,'status'=>'pending',
        'source'=>'danfe_ai','needs_review'=>true,'geocoded_by'=>'unresolved','created_at'=>date('c')];
    $complete=true;
    foreach (['logradouro','numero','municipio','uf'] as $key) if ($delivery[$key]==='') $complete=false;
    if ($complete) foreach ($companies as $company) {
        if (!is_array($company)) throw new RuntimeException('catalog');
        $names=[danfeFold(danfeText($company['nome']??'')),danfeFold(danfeText($company['fantasia']??''))];
        if (!in_array(danfeFold($delivery['destinatario']),$names,true)) continue;
        $same=true;
        foreach (['logradouro','numero','complemento','municipio','uf'] as $key) if (danfeFold($delivery[$key])!==danfeFold(danfeText($company[$key]??''))) $same=false;
        if (!$same || !danfeCoordinates($company)) continue;
        $delivery['lat']=(float)$company['lat'];$delivery['lon']=(float)$company['lon'];$delivery['geocoded_by']='local_db';
        break;
    }
    if ($delivery['lat']===null && $delivery['logradouro']!=='' && $delivery['municipio']!=='' && $delivery['uf']!=='') {
        $geo=$geocode(implode(', ',array_filter([$delivery['logradouro'],$delivery['numero'],$delivery['bairro']],fn($v)=>$v!=='')),$delivery['municipio'],$delivery['uf']);
        if (is_array($geo) && danfeCoordinates($geo)) {
            $delivery['lat']=(float)$geo['lat'];$delivery['lon']=(float)$geo['lon'];$delivery['geocoded_by']='nominatim_suggestion';
        }
    }
    $delivery['endereco_completo']=implode(', ',array_filter(array_map(fn($key)=>$delivery[$key],['logradouro','numero','complemento','bairro','municipio','uf','cep']),fn($v)=>$v!==''));
    return $delivery;
}
