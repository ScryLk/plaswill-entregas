<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$b=getJsonBody(); $id=routeId($b['route_id']??null);
storeLock(function() use($id) { $r=loadRoute($id); $r['_driver']['revoked']=true; atomicDocument(routePath($id),$r); });
jsonResponse(['success'=>true]);
