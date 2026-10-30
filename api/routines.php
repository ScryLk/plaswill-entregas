<?php
declare(strict_types=1);
require_once __DIR__.'/catalog.php';

function routineId(mixed $id): string {
    if (!is_string($id) || !preg_match('/^RUT-[a-f0-9]{32}$/D',$id)) invalid('Identificador de rotina inválido.');
    return $id;
}
function routinePath(string $id): string { return dataDir().'/routines/'.routineId($id).'.json'; }
function operationId(mixed $id): string {
    if (!is_string($id) || !preg_match('/^[A-Za-z0-9_-]{16,100}$/D',$id)) invalid('Identificador de operação obrigatório.');
    return $id;
}
function routineDate(mixed $value): string {
    $value=textField($value,10);
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value);
    if (!$date || $date->format('Y-m-d')!==$value) invalid('Data prevista inválida.');
    return $value;
}
function routineMetadata(array $input): array {
    $name=textField($input['name']??'Nova rotina',150);
    if ($name==='') invalid('Informe o nome da rotina.');
    $origin=$input['origin']??readDocument(dirname(__DIR__).'/origin.json');
    validateOrigin($origin);
    return ['name'=>$name,'scheduled_date'=>routineDate($input['scheduled_date']??null),
        'origin'=>$origin,'motorista'=>textField($input['motorista']??'',300),
        'veiculo'=>textField($input['veiculo']??'',300),'notes'=>textField($input['notes']??'',2000)];
}
/** Flat address fields are the immutable-at-dispatch snapshot, not live catalogue pointers. */
function planningStops(mixed $input): array {
    if (!is_array($input) || !array_is_list($input) || count($input)>500) invalid('Máximo de 500 entregas por rotina.');
    $stops=[];$ids=[];
    foreach ($input as $stop) {
        if (!is_array($stop)) invalid('Entrega inválida.');
        $id=stopId($stop['id']??null);
        if (isset($ids[$id])) invalid('Identificadores de entrega duplicados.');
        $ids[$id]=true;
        if (($stop['status']??'pending')!=='pending') invalid('O planejamento só aceita entregas pendentes.');
        $s=['id'=>$id,'status'=>'pending'];
        foreach (['destinatario','nome_fantasia','client_id','address_id','logradouro','numero','complemento','bairro','municipio','uf','cep','endereco_completo','numero_nota','serie','emitente','cnpj','itens_resumo','observacoes','created_at','geocoded_by'] as $key) {
            if (array_key_exists($key,$stop)) $s[$key]=textField($stop[$key],$key==='observacoes'||$key==='itens_resumo'?2000:500);
        }
        $volumes=$stop['volumes']??null;
        if ($volumes!==null && (!is_int($volumes)||$volumes<0||$volumes>100000)) invalid('Quantidade de volumes inválida.');
        if ($volumes!==null) $s['volumes']=$volumes;
        $lat=$stop['lat']??null;$lon=$stop['lon']??null;
        if ($lat===null && $lon===null) { $s['lat']=null;$s['lon']=null;$s['geocoded_by']='unresolved'; }
        else { coordinates($stop);$s['lat']=(float)$lat;$s['lon']=(float)$lon; }
        $stops[]=$s;
    }
    return $stops;
}
function readyToDispatch(array $routine): void {
    if (count($routine['stops'])===0) invalid('Inclua pelo menos uma entrega antes do despacho.');
    validateOrigin($routine['origin']);
    foreach ($routine['stops'] as $stop) {
        if (empty($stop['destinatario']) || empty($stop['logradouro']) || empty($stop['municipio']) || empty($stop['uf'])) invalid('Revise os endereços incompletos.');
        if (!verifiedCoordinates($stop)) invalid('Revise entregas sem coordenadas confiáveis.');
    }
}
function routineActor(): string { return requestPrincipal()['id']; }
function loadRoutine(string $id): array {
    $path=routinePath($id);
    if (!is_file($path)) jsonResponse(['error'=>'Rotina não encontrada.'],404);
    $r=readDocument($path);
    if (($r['routine_id']??null)!==$id || !is_array($r['stops']??null) || !is_int($r['version']??null)) throw new RuntimeException('routine');
    return $r;
}
function findRoutineRoute(array $routine): ?array {
    if (!empty($routine['route_id'])) {
        $route=loadRoute($routine['route_id']);
        if (($route['routine_id']??null)!==$routine['routine_id']) throw new RuntimeException('association');
        return $route;
    }
    // Index once per request: avoid a full route scan for every draft on the list.
    static $index;
    if ($index===null) {
        $index=[];
        foreach (glob(dataDir().'/routes/ROT-*.json') as $file) {
            $route=readDocument($file);$ref=$route['routine_id']??null;
            if ($ref===null) continue;
            if (isset($index[$ref])) throw new RuntimeException('duplicate association');
            $index[$ref]=$file;
        }
    }
    return isset($index[$routine['routine_id']]) ? readDocument($index[$routine['routine_id']]) : null;
}
function reconcileRoutine(array $routine, ?array $route): array {
    if ($route===null) return $routine;
    $changed=false;
    if (($routine['route_id']??null)!==$route['route_id']) {
        $routine['route_id']=$route['route_id'];$routine['dispatched_at']=$route['created_at'];$routine['dispatched_by']=$route['_dispatch_actor']??null;$routine['status']='dispatched';$changed=true;
    }
    if (($route['status']??'')==='cancelled' && $routine['status']!=='cancelled') {
        $routine['status']='cancelled';
        foreach (['cancelled_at','cancelled_by','cancellation_reason'] as $key) $routine[$key]=$route[$key];
        $changed=true;
    }
    if (($route['status']??'')==='finished' && $routine['status']!=='finished') {
        $routine['status']='finished';$routine['finished_at']=$route['finished_at'];$changed=true;
    }
    if ($changed) { $routine['version']++;$routine['updated_at']=date('c');atomicDocument(routinePath($routine['routine_id']),$routine); }
    return $routine;
}
function routineView(array $r, ?array $route): array {
    unset($r['_operations'],$r['_create']);
    if ($route!==null) {
        $r['stops']=$route['stops'];
        if (isset($route['observacoes_fechamento'])) $r['observacoes_fechamento']=$route['observacoes_fechamento'];
        if (($route['status']??'')==='finished') { $r['status']='finished';$r['finished_at']=$route['finished_at']; }
        elseif (($route['status']??'')==='cancelled') $r['status']='cancelled';
        elseif (($route['version']??0)>0 || !empty($route['last_update'])) $r['status']='in_progress';
        else $r['status']='dispatched';
    }
    $r['total_stops']=count($r['stops']);
    $r['delivered_stops']=count(array_filter($r['stops'],fn($s)=>($s['status']??'')==='delivered'));
    $r['pending_stops']=$r['total_stops']-$r['delivered_stops'];
    $r['completion_rate']=$r['total_stops']?round(100*$r['delivered_stops']/$r['total_stops'],1):0;
    $destinations=[];
    foreach ($r['stops'] as $s) {
        $key=implode('|',array_map(fn($k)=>catalogFold((string)($s[$k]??'')),['logradouro','numero','complemento','bairro','municipio','uf','cep']));
        $destinations[$key]=true;
    }
    $r['destinations']=count($destinations);
    $r['editable']=$route===null && in_array($r['status'],['draft','planned'],true);
    return $r;
}
function checkedRoutine(array $body): array {
    $r=loadRoutine(routineId($body['routine_id']??null));
    $route=findRoutineRoute($r);$r=reconcileRoutine($r,$route);
    return [$r,$route];
}
function expectedRoutineVersion(array $r,array $body): void {
    if (!isset($body['expected_version']) || !is_int($body['expected_version']) || $body['expected_version']<0) invalid('Versão da rotina obrigatória.');
    if ($body['expected_version']!==$r['version']) jsonResponse(['error'=>'A rotina mudou em outro acesso. Suas alterações locais foram preservadas.','code'=>'routine_version_conflict','version'=>$r['version']],409);
}
function createRoutine(array $body): array {
    $metadata=routineMetadata($body);
    $op=operationId($body['operation_id']??null);$actor=routineActor();
    $fingerprint=hash('sha256',json_encode($metadata,JSON_THROW_ON_ERROR));
    foreach (glob(dataDir().'/routines/RUT-*.json') as $file) {
        $r=readDocument($file);
        if (($r['_create']['operation_id']??null)===$op && ($r['created_by']??null)===$actor) {
            if ($r['_create']['fingerprint']!==$fingerprint) jsonResponse(['error'=>'Operação reutilizada com dados diferentes.'],409);
            $route=findRoutineRoute($r);return routineView(reconcileRoutine($r,$route),$route);
        }
    }
    do { $id='RUT-'.bin2hex(random_bytes(16)); } while (file_exists(routinePath($id)));
    $r=$metadata+['routine_id'=>$id,'status'=>'draft','route_id'=>null,'version'=>0,'stops'=>[],
        'created_by'=>$actor,'updated_by'=>$actor,'created_at'=>date('c'),'updated_at'=>date('c'),
        '_create'=>['operation_id'=>$op,'fingerprint'=>$fingerprint]];
    atomicDocument(routinePath($id),$r);return routineView($r,null);
}
function updateRoutine(array $body): array {
    [$r,$route]=checkedRoutine($body);
    if ($route!==null || !in_array($r['status'],['draft','planned'],true)) jsonResponse(['error'=>'Planejamento encerrado ou já despachado.'],409);
    $op=operationId($body['operation_id']??null);
    $data=routineMetadata($body)+['stops'=>planningStops($body['stops']??null),'status'=>$body['status']??'draft'];
    if (!in_array($data['status'],['draft','planned'],true)) invalid('Transição de planejamento inválida.');
    $hash=hash('sha256',json_encode($data,JSON_THROW_ON_ERROR));
    if (isset($r['_operations'][$op])) {
        if ($r['_operations'][$op]!==$hash) jsonResponse(['error'=>'Operação reutilizada com dados diferentes.'],409);
        return routineView($r,null);
    }
    expectedRoutineVersion($r,$body);
    if ($data['status']==='planned') readyToDispatch($data);
    if (count($r['_operations']??[])>=10000) jsonResponse(['error'=>'Limite de operações da rotina atingido.'],409);
    $r=array_replace($r,$data);$r['version']++;$r['updated_at']=date('c');$r['updated_by']=routineActor();
    $r['_operations'][$op]=$hash;
    atomicDocument(routinePath($r['routine_id']),$r);return routineView($r,null);
}
function dispatchRoutine(array $body): array {
    [$r,$route]=checkedRoutine($body);
    if ($r['status']==='cancelled') jsonResponse(['error'=>'Rotina cancelada.'],409);
    if ($route!==null) return ['routine'=>routineView($r,$route),'route_id'=>$route['route_id'],'share_url'=>null,'replayed'=>true];
    if (!in_array($r['status'],['draft','planned'],true)) jsonResponse(['error'=>'Transição de despacho inválida.'],409);
    expectedRoutineVersion($r,$body);readyToDispatch($r);
    [$route,$token]=createRoute(['stops'=>$r['stops'],'origin'=>$r['origin'],'motorista'=>$r['motorista'],'veiculo'=>$r['veiculo']],null,$r['routine_id'],routineActor());
    $r=reconcileRoutine($r,$route);
    return ['routine'=>routineView($r,$route),'route_id'=>$route['route_id'],'share_url'=>'motorista.html?r='.$route['route_id'].'#token='.$token,'replayed'=>false];
}
function cancelRoutine(array $body): array {
    [$r,$route]=checkedRoutine($body);
    $view=routineView($r,$route);
    if ($view['status']==='finished') jsonResponse(['error'=>'Rotina finalizada não pode ser cancelada.'],409);
    if ($view['status']==='cancelled') return $view;
    expectedRoutineVersion($r,$body);
    $reason=textField($body['reason']??'',2000);
    if (strlen($reason)<3) invalid('Informe o motivo do cancelamento.');
    $audit=['cancelled_at'=>date('c'),'cancelled_by'=>routineActor(),'cancellation_reason'=>$reason];
    if ($route!==null) {
        $route=array_replace($route,$audit);$route['status']='cancelled';$route['_driver']['revoked']=true;
        atomicDocument(routePath($route['route_id']),$route);
    }
    $r=array_replace($r,$audit);$r['status']='cancelled';$r['version']++;$r['updated_at']=date('c');$r['updated_by']=routineActor();
    atomicDocument(routinePath($r['routine_id']),$r);return routineView($r,$route);
}
function listRoutines(array $query): array {
    $q=catalogFold(textField($query['q']??'',200));$status=textField($query['status']??'',30);
    if (!in_array($status,['','draft','planned','dispatched','in_progress','finished','cancelled'],true)) invalid('Situação inválida.');
    $from=isset($query['from'])&&$query['from']!==''?routineDate($query['from']):'';
    $to=isset($query['to'])&&$query['to']!==''?routineDate($query['to']):'';
    if ($from!==''&&$to!==''&&$from>$to) invalid('Período inválido.');
    $page=positivePage($query['page']??'1');$limit=positivePage($query['per_page']??'20',50);
    $order=textField($query['order']??'desc',4);if (!in_array($order,['asc','desc'],true)) invalid('Ordenação inválida.');
    $rows=[];
    foreach (glob(dataDir().'/routines/RUT-*.json') as $file) {
        $r=readDocument($file);$route=findRoutineRoute($r);$r=routineView(reconcileRoutine($r,$route),$route);
        if ($status!=='' && $r['status']!==$status || $from!=='' && $r['scheduled_date']<$from || $to!=='' && $r['scheduled_date']>$to) continue;
        if ($q!==''&&!str_contains(catalogFold($r['routine_id'].' '.($r['route_id']??'').' '.$r['name'].' '.($r['created_by']??'').' '.$r['scheduled_date'].' '.implode('/',array_reverse(explode('-',$r['scheduled_date'])))),$q)) continue;
        unset($r['stops']);$rows[]=$r;
    }
    usort($rows,fn($a,$b)=>($order==='asc'?1:-1)*strcmp($a['scheduled_date'],$b['scheduled_date']) ?: strcmp($b['created_at'].$b['routine_id'],$a['created_at'].$a['routine_id']));
    return ['results'=>array_slice($rows,($page-1)*$limit,$limit),'total'=>count($rows),'page'=>$page,'pages'=>max(1,(int)ceil(count($rows)/$limit))];
}
