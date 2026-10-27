<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$b=getJsonBody(); $id=routeId($b['route_id']??null);
$token=storeLock(function()use($id){
    $r=loadRoute($id);
    if (in_array($r['status']??'',['finished','cancelled'],true)) jsonResponse(['error'=>'Rota encerrada.'],409);
    $token=bin2hex(random_bytes(32));
    $r['_driver']=['hash'=>hash('sha256',$token),'expires_at'=>time()+7*86400,'revoked'=>false];
    atomicDocument(routePath($id),$r);return $token;
});
jsonResponse(['success'=>true,'share_url'=>'motorista.html?r='.$id.'#token='.$token]);
