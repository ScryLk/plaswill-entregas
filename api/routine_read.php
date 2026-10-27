<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
require_once __DIR__.'/routines.php';
$result=storeLock(function(){
    if (isset($_GET['id'])) {
        [$r,$route]=checkedRoutine(['routine_id'=>$_GET['id']]);
        return ['routine'=>routineView($r,$route)];
    }
    return listRoutines($_GET);
});
jsonResponse(['success'=>true]+$result);
