<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$rows=storeLock(fn()=>historyRows());
jsonResponse(['success'=>true,'total'=>count($rows),'history'=>$rows]);
