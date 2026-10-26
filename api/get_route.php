<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$id=routeId($_GET['id']??$_GET['r']??null);
$r=storeLock(function() use($id) { $r=loadRoute($id); authorizeRoute($r); return publicRoute($r); });
jsonResponse(['success'=>true,'route'=>$r]);
