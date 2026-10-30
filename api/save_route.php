<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$body=getJsonBody();
[$r,$token,$replayed]=storeLock(function()use($body){
    $receipt=null;
    if (array_key_exists('operation_id',$body)) {
        $op=$body['operation_id'];
        if (!is_string($op)||!preg_match('/^[A-Za-z0-9_-]{16,100}$/D',$op)) invalid('Identificador de operação inválido.');
        $receipt=['operation_id'=>$op,'actor'=>requestPrincipal()['id'],'fingerprint'=>hash('sha256',json_encode($body,JSON_THROW_ON_ERROR))];
        foreach (glob(dataDir().'/routes/ROT-*.json') as $file) {
            $route=readDocument($file);
            if (($route['_create']['operation_id']??null)!==$op || ($route['_create']['actor']??null)!==$receipt['actor']) continue;
            if ($route['_create']['fingerprint']!==$receipt['fingerprint']) jsonResponse(['error'=>'Operação reutilizada com dados diferentes.'],409);
            return [$route,null,true];
        }
    }
    [$route,$token]=createRoute($body,null,null,null,$receipt);
    return [$route,$token,false];
});
jsonResponse(['success'=>true,'route_id'=>$r['route_id'],'share_url'=>$token===null?null:'motorista.html?r='.$r['route_id'].'#token='.$token,'replayed'=>$replayed,'total_stops'=>$r['total_stops'],'data_formatada'=>$r['data_formatada']]);
