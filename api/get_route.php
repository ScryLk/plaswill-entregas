<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$routeId = trim($_GET["id"] ?? $_GET["r"] ?? "");
if (empty($routeId)) {
    jsonResponse(["error" => "Parâmetro 'id' ou 'r' da rota é obrigatório."], 400);
}

// Sanitização básica do ID
$routeId = preg_replace('/[^A-Za-z0-9_-]/', '', $routeId);

$routesDir = dirname(__DIR__) . "/data/routes";
$filePath = "{$routesDir}/{$routeId}.json";

if (!file_exists($filePath)) {
    jsonResponse(["error" => "Rota '{$routeId}' não encontrada ou expirada."], 404);
}

$raw = file_get_contents($filePath);
$data = json_decode($raw, true);

if (empty($data)) {
    jsonResponse(["error" => "Erro ao ler os dados da rota."], 500);
}

jsonResponse([
    "success" => true,
    "route" => $data
]);
