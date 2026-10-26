<?php
declare(strict_types=1);

// Shared validation, fail-closed authorization and JSON transaction protocol.
function invalid(string $message = 'Requisição inválida.'): never { jsonResponse(['error'=>$message],400); }
function textField(mixed $v, int $max=300): string {
    if (!is_string($v) || strlen($v)>$max || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $v)) invalid();
    return trim($v);
}
function routeId(mixed $v): string {
    if (!is_string($v) || !preg_match('/^ROT-[A-Z0-9]{4}$/D',$v)) invalid('Identificador de rota inválido.');
    return $v;
}
function stopId(mixed $v): string {
    if (!is_string($v) || !preg_match('/^[A-Za-z0-9_-]{1,100}$/D',$v)) invalid('Identificador de parada inválido.');
    return $v;
}
function coordinates(mixed $v): void {
    if (!is_array($v)) invalid('Coordenadas obrigatórias.');
    foreach (['lat'=>90,'lon'=>180] as $k=>$limit) {
        if (!isset($v[$k]) || !is_numeric($v[$k]) || is_bool($v[$k]) || !is_finite((float)$v[$k]) || abs((float)$v[$k])>$limit) invalid('Coordenadas inválidas.');
    }
}
function validateOrigin(mixed $origin): void {
    coordinates($origin);
    foreach ($origin as $key=>$value) {
        if (!in_array($key,['lat','lon'],true)) textField($value,2000);
    }
}
function validateStops(mixed $stops): array {
    if (!is_array($stops) || !array_is_list($stops) || count($stops)<1 || count($stops)>500) invalid('Informe entre 1 e 500 paradas.');
    $ids=[];
    foreach ($stops as &$s) {
        if (!is_array($s)) invalid();
        $id=stopId($s['id']??null);
        if (isset($ids[$id])) invalid('Paradas duplicadas.');
        $ids[$id]=true;
        coordinates($s);
        if (!in_array($s['status']??'pending',['pending','delivered'],true)) invalid('Status inválido.');
        foreach ($s as $k=>$v) {
            if (in_array($k,['lat','lon','version'],true)) continue;
            textField($v,2000);
        }
        $s['status']=$s['status']??'pending';
        if (isset($s['version']) && (!is_int($s['version']) || $s['version']<0)) invalid('Versão inválida.');
    }
    return $stops;
}
function dataDir(): string { return getenv('ENTREGAS_DATA_DIR') ?: dirname(__DIR__).'/data'; }
function storeLock(callable $fn): mixed {
    $dir=dataDir();
    if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('storage');
    $f=fopen($dir.'/.store.lock','c');
    if (!$f || !flock($f,LOCK_EX)) throw new RuntimeException('storage');
    try { return $fn(); } finally { flock($f,LOCK_UN); fclose($f); }
}
function readDocument(string $path): array {
    $value=json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
    if (!is_array($value)) throw new RuntimeException('storage');
    return $value;
}
function atomicDocument(string $path,array $data): void {
    $dir=dirname($path);
    if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('storage');
    $json=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR);
    clearstatcache(true,$dir);
    if (!is_writable($dir)) throw new RuntimeException('storage');
    $tmp=tempnam($dir,'.write-');
    if ($tmp===false || dirname($tmp)!==realpath($dir)) { if ($tmp && is_file($tmp)) unlink($tmp); throw new RuntimeException('storage'); }
    try {
        $stream=fopen($tmp,'wb');
        try {
            if (!$stream || fwrite($stream,$json)!==strlen($json) || !fflush($stream) || !fsync($stream)) throw new RuntimeException('storage');
        } finally { if (is_resource($stream)) fclose($stream); }
        if (!rename($tmp,$path)) throw new RuntimeException('storage');
    } finally { if (is_file($tmp)) unlink($tmp); }
}
function routePath(string $id): string { return dataDir().'/routes/'.routeId($id).'.json'; }
function loadRoute(string $id): array {
    if (!is_file(routePath($id))) jsonResponse(['error'=>'Rota não encontrada.'],404);
    $r=readDocument(routePath($id));
    if (($r['route_id']??null)!==$id || !isset($r['stops']) || !is_array($r['stops'])) throw new RuntimeException('storage');
    return $r;
}
function publicRoute(array $r): array { unset($r['_driver'],$r['_operations'],$r['_create_operation']); return $r; }
function operatorAllowed(): bool {
    return requestPrincipal() !== null;
}
function requireOperator(): void {
    requireCorporatePermission(permissionForEndpoint());
}
function authorizeRoute(array $r): void {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($auth === '') { requireOperator(); return; }
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/D', $auth, $m)) jsonResponse(['error'=>'Credencial da rota necessária.'],401);
    $d=$r['_driver']??[];
    if (($d['revoked']??true) || ($d['expires_at']??0)<=time() || !hash_equals($d['hash']??'',hash('sha256',$m[1]))) jsonResponse(['error'=>'Credencial inválida, expirada ou revogada.'],403);
}
function newCode(): string {
    $chars='23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; $id='ROT-';
    for ($i=0;$i<4;$i++) $id.=$chars[random_int(0,strlen($chars)-1)];
    return $id;
}
function createRoute(array $body, ?callable $generator=null): array {
    $stops=validateStops($body['stops']??null);
    foreach ($stops as &$stop) $stop['version']=0;
    unset($stop);
    $origin=$body['origin']??null;
    if ($origin!==null) validateOrigin($origin);
    for ($i=0;$i<100;$i++) {
        $id=routeId($generator ? $generator() : newCode());
        // All readers/writers hold the stable store lock; reservation and rename are one transaction.
        if (file_exists(routePath($id))) continue;
        $token=bin2hex(random_bytes(32));
        $r=['route_id'=>$id,'created_at'=>date('c'),'data_formatada'=>date('d/m/Y H:i'),
            'motorista'=>textField($body['motorista']??'Motorista da Expedição'),
            'veiculo'=>textField($body['veiculo']??'Furgão / Utilitário'), 'origin'=>$origin,
            'total_stops'=>count($stops),'stops'=>$stops,'version'=>0,
            '_driver'=>['hash'=>hash('sha256',$token),'expires_at'=>time()+7*86400,'revoked'=>false]];
        atomicDocument(routePath($id),$r);
        return [$r,$token];
    }
    throw new RuntimeException('allocation');
}
function historyRows(): array {
    $file=dataDir().'/routes_history.json';
    $rows=is_file($file)?readDocument($file):[];
    $byId=[];
    foreach ($rows as $row) { if (!is_array($row)||!isset($row['route_id'])) throw new RuntimeException('storage'); $byId[$row['route_id']]=$row; }
    foreach (glob(dataDir().'/routes/ROT-*.json') as $path) {
        $r=readDocument($path);
        if (($r['status']??'')!=='finished') continue;
        $row=array_intersect_key($r,array_flip(['route_id','created_at','finished_at','motorista','veiculo','total_stops','delivered_stops','pending_stops','completion_rate','status']));
        $row['data_formatada']=$r['finished_data_formatada']; $byId[$r['route_id']]=$row;
    }
    $rows=array_values($byId); usort($rows,fn($a,$b)=>strcmp($b['finished_at'],$a['finished_at']));
    return array_slice($rows,0,100);
}
