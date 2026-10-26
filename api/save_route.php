<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$body = getJsonBody();
$stops = $body["stops"] ?? [];
$origin = $body["origin"] ?? null;
$motorista = trim($body["motorista"] ?? "Motorista da Expedição");
$veiculo = trim($body["veiculo"] ?? "Furgão / Utilitário");

if (empty($stops) || !is_array($stops)) {
    jsonResponse(["error" => "Nenhuma parada de entrega para salvar."], 400);
}

// Gera código curto e elegante da rota (ex: ROT-8M4K)
$chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
$code = "ROT-";
for ($i = 0; $i < 4; $i++) {
    $code .= $chars[random_int(0, strlen($chars) - 1)];
}

$routesDir = dirname(__DIR__) . "/data/routes";
if (!is_dir($routesDir)) {
    mkdir($routesDir, 0777, true);
}

$routeData = [
    "route_id" => $code,
    "created_at" => date("c"),
    "data_formatada" => date("d/m/Y H:i"),
    "motorista" => $motorista,
    "veiculo" => $veiculo,
    "origin" => $origin,
    "total_stops" => count($stops),
    "stops" => $stops
];

$filePath = "{$routesDir}/{$code}.json";
file_put_contents($filePath, json_encode($routeData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

// Gera URL completa
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'] ?? "entregas.plaswill.tech";
$scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
$subPath = preg_replace('#/api$#', '', $scriptDir);
$basePath = !empty($subPath) ? rtrim($subPath, '/') . '/' : '/';
$shareUrl = "{$protocol}://{$host}{$basePath}motorista.html?r={$code}";

jsonResponse([
    "success" => true,
    "route_id" => $code,
    "share_url" => $shareUrl,
    "total_stops" => count($stops),
    "data_formatada" => $routeData["data_formatada"]
]);
