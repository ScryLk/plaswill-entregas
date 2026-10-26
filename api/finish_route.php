<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$b=getJsonBody();
$result=storeLock(function() use($b) {
    if (empty($b['route_id']) && empty($b['r'])) {
        requireOperator();
        // Draft closure must first create an authoritative route. Client retains this id for retries.
        jsonResponse(['error'=>'Salve a rotina antes de finalizar.','code'=>'save_before_finish'],409);
    }
    $id=routeId($b['route_id']??$b['r']); $r=loadRoute($id); authorizeRoute($r);
    if (($r['status']??'')==='cancelled') jsonResponse(['error'=>'Rota cancelada.'],409);
    if (($r['status']??'')!=='finished') {
        $r['status']='finished'; $r['finished_at']=date('c'); $r['finished_data_formatada']=date('d/m/Y H:i');
        $r['observacoes_fechamento']=textField($b['observacoes']??'',2000);
        $r['total_stops']=count($r['stops']);
        $r['delivered_stops']=count(array_filter($r['stops'],fn($s)=>($s['status']??'')==='delivered'));
        $r['pending_stops']=$r['total_stops']-$r['delivered_stops'];
        $r['completion_rate']=$r['total_stops']?round(100*$r['delivered_stops']/$r['total_stops'],1):100;
        atomicDocument(routePath($id),$r);
    }
    return ['success'=>true,'route_id'=>$id,'delivered_stops'=>$r['delivered_stops'],'pending_stops'=>$r['pending_stops'],'total_stops'=>$r['total_stops'],'completion_rate'=>$r['completion_rate'],'finished_at'=>$r['finished_data_formatada']];
});
jsonResponse($result);
