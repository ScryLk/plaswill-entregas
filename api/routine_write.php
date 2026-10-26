<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
require_once __DIR__.'/routines.php';
$body=getJsonBody();
$action=$body['action']??null;
if (!in_array($action,['create','update','dispatch','cancel'],true)) invalid('Ação de rotina inválida.');
$result=storeLock(fn()=>match($action){
    'create'=>['routine'=>createRoutine($body)],
    'update'=>['routine'=>updateRoutine($body)],
    'dispatch'=>dispatchRoutine($body),
    'cancel'=>['routine'=>cancelRoutine($body)],
});
jsonResponse(['success'=>true]+$result);
