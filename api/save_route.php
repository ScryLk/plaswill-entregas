<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
require_once __DIR__.'/routines.php';

$body=getJsonBody();
[$r,$token,$replayed]=storeLock(function()use($body){
    $receipt=null;
    $actor=requestPrincipal()['id']??null;
    if (array_key_exists('operation_id',$body)) {
        $op=$body['operation_id'];
        if (!is_string($op)||!preg_match('/^[A-Za-z0-9_-]{16,100}$/D',$op)) invalid('Identificador de operação inválido.');
        $receipt=['operation_id'=>$op,'actor'=>$actor,'fingerprint'=>hash('sha256',json_encode($body,JSON_THROW_ON_ERROR))];
        foreach (glob(dataDir().'/routes/ROT-*.json') as $file) {
            $route=readDocument($file);
            if (($route['_create']['operation_id']??null)!==$op || ($route['_create']['actor']??null)!==$receipt['actor']) continue;
            if ($route['_create']['fingerprint']!==$receipt['fingerprint']) jsonResponse(['error'=>'Operação reutilizada com dados diferentes.'],409);
            return [$route,null,true];
        }
    }
    $routineId=null;
    if ($actor!==null && is_string($actor) && $actor!=='') {
        do { $routineId='RUT-'.bin2hex(random_bytes(16)); } while (file_exists(routinePath($routineId)));
    }
    [$route,$token]=createRoute($body,null,$routineId,$actor,$receipt);
    if ($routineId!==null) {
        $routineDoc=[
            'routine_id'=>$routineId,
            'name'=>'Expedição '.$actor.' ('.$route['route_id'].')',
            'scheduled_date'=>date('Y-m-d'),
            'origin'=>$route['origin'],
            'motorista'=>$route['motorista'],
            'veiculo'=>$route['veiculo'],
            'notes'=>'Viagem despachada por '.$actor,
            'status'=>'dispatched',
            'route_id'=>$route['route_id'],
            'version'=>0,
            'stops'=>$route['stops'],
            'created_by'=>$actor,
            'updated_by'=>$actor,
            'dispatched_by'=>$actor,
            'dispatched_at'=>$route['created_at'],
            'created_at'=>$route['created_at'],
            'updated_at'=>$route['created_at'],
            '_create'=>['operation_id'=>$receipt['operation_id']??('op-'.bin2hex(random_bytes(8))),'fingerprint'=>$receipt['fingerprint']??'']
        ];
        atomicDocument(routinePath($routineId),$routineDoc);
    }
    return [$route,$token,false];
});
jsonResponse(['success'=>true,'route_id'=>$r['route_id'],'share_url'=>$token===null?null:'motorista.html?r='.$r['route_id'].'#token='.$token,'replayed'=>$replayed,'total_stops'=>$r['total_stops'],'data_formatada'=>$r['data_formatada']]);
