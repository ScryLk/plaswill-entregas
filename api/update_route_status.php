<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$body = getJsonBody();
$routeId = trim($body["route_id"] ?? $body["r"] ?? "");
$stopId = trim($body["stop_id"] ?? "");
$newStatus = trim($body["status"] ?? "delivered");

if (empty($routeId) || empty($stopId)) {
    jsonResponse(["error" => "Parâmetros 'route_id' e 'stop_id' são obrigatórios."], 400);
}

// Sanitização básica do ID
$routeId = preg_replace('/[^A-Za-z0-9_-]/', '', $routeId);

$routesDir = dirname(__DIR__) . "/data/routes";
$filePath = "{$routesDir}/{$routeId}.json";

if (!file_exists($filePath)) {
    jsonResponse(["error" => "Rota '{$routeId}' não encontrada."], 404);
}

$raw = file_get_contents($filePath);
$data = json_decode($raw, true);

if (empty($data) || empty($data["stops"])) {
    jsonResponse(["error" => "Dados da rota inválidos."], 500);
}

$found = false;
foreach ($data["stops"] as &$stop) {
    if (($stop["id"] ?? "") === $stopId) {
        $stop["status"] = $newStatus;
        $stop["updated_at"] = date("c");
        $found = true;
        break;
    }
}

if (!$found) {
    jsonResponse(["error" => "Parada '{$stopId}' não encontrada nesta rota."], 404);
}

// Recalcula total de concluídas
$deliveredCount = 0;
foreach ($data["stops"] as $stop) {
    if (($stop["status"] ?? "") === "delivered") {
        $deliveredCount++;
    }
}
$data["delivered_stops"] = $deliveredCount;
$data["last_update"] = date("c");

file_put_contents($filePath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

jsonResponse([
    "success" => true,
    "route_id" => $routeId,
    "stop_id" => $stopId,
    "status" => $newStatus,
    "delivered_stops" => $deliveredCount,
    "total_stops" => count($data["stops"])
]);
