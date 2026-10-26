<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
$body=getJsonBody();
[$r,$token]=storeLock(fn()=>createRoute($body));
jsonResponse(['success'=>true,'route_id'=>$r['route_id'],'share_url'=>'motorista.html?r='.$r['route_id'].'#token='.$token,'total_stops'=>$r['total_stops'],'data_formatada'=>$r['data_formatada']]);
