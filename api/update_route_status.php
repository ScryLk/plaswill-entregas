<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$b=getJsonBody(); $id=routeId($b['route_id']??$b['r']??null); $stopId=stopId($b['stop_id']??null);
$status=$b['status']??'delivered';
if (!in_array($status,['pending','delivered'],true)) invalid('Status inválido.');
$op=$b['operation_id']??null;
if ($op!==null && (!is_string($op)||!preg_match('/^[A-Za-z0-9_-]{16,100}$/D',$op))) invalid('Operação inválida.');
if ($op!==null && (!isset($b['expected_version'])||!is_int($b['expected_version'])||$b['expected_version']<0)) invalid('Versão obrigatória.');
$result=storeLock(function() use($b,$id,$stopId,$status,$op) {
    $r=loadRoute($id); authorizeRoute($r);
    $fingerprint=hash('sha256',json_encode([$stopId,$status,$b['expected_version']??null]));
    if ($op!==null && isset($r['_operations'][$op])) {
        $old=$r['_operations'][$op];
        if ($old['fingerprint']!==$fingerprint) jsonResponse(['error'=>'Operação reutilizada com dados diferentes.'],409);
        return $old['result'];
    }
    if (($r['status']??'')==='finished') jsonResponse(['error'=>'Rota encerrada.','code'=>'route_finished'],409);
    $index=null;
    foreach($r['stops'] as $i=>$s) if (($s['id']??null)===$stopId) { $index=$i; break; }
    if ($index===null) jsonResponse(['error'=>'Parada não encontrada.'],404);
    $version=$r['stops'][$index]['version']??0;
    if (isset($b['expected_version']) && $b['expected_version']!==$version) jsonResponse(['error'=>'Conflito: atualize a rota.','code'=>'version_conflict','version'=>$version],409);
    if (($r['stops'][$index]['status']??'pending')!==$status) {
        $r['stops'][$index]['status']=$status;
        $r['stops'][$index]['version']=++$version;
        $r['stops'][$index]['updated_at']=date('c');
        $r['version']=($r['version']??0)+1;
    }
    $delivered=count(array_filter($r['stops'],fn($s)=>($s['status']??'')==='delivered'));
    $r['delivered_stops']=$delivered; $r['last_update']=date('c');
    $result=['success'=>true,'route_id'=>$id,'stop_id'=>$stopId,'status'=>$status,'operation_id'=>$op,'version'=>$version,'delivered_stops'=>$delivered,'total_stops'=>count($r['stops'])];
    if ($op!==null) {
        if (count($r['_operations']??[])>=10000) jsonResponse(['error'=>'Limite de operações atingido.'],409);
        $r['_operations'][$op]=['fingerprint'=>$fingerprint,'result'=>$result];
    }
    atomicDocument(routePath($id),$r); return $result;
});
jsonResponse($result);
