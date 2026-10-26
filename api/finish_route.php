<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$body = getJsonBody();
$routeId = trim($body["route_id"] ?? $body["r"] ?? "");
$motorista = trim($body["motorista"] ?? "Motorista da Expedição");
$veiculo = trim($body["veiculo"] ?? "Furgão / Utilitário");
$observacoes = trim($body["observacoes"] ?? "");
$stops = $body["stops"] ?? null;

if (empty($routeId)) {
    // Se não informou route_id, gera um novo para salvar a rotina atual que estava no localStorage
    $chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    $routeId = "ROT-";
    for ($i = 0; $i < 4; $i++) {
        $routeId .= $chars[random_int(0, strlen($chars) - 1)];
    }
} else {
    $routeId = preg_replace('/[^A-Za-z0-9_-]/', '', $routeId);
}

$routesDir = dirname(__DIR__) . "/data/routes";
if (!is_dir($routesDir)) {
    mkdir($routesDir, 0777, true);
}

$filePath = "{$routesDir}/{$routeId}.json";
$routeData = [];

if (file_exists($filePath)) {
    $routeData = json_decode(file_get_contents($filePath), true) ?: [];
}

// Se o cliente enviou o array atualizado de paradas, atualiza
if (!empty($stops) && is_array($stops)) {
    $routeData["stops"] = $stops;
    $routeData["total_stops"] = count($stops);
}

$total = count($routeData["stops"] ?? []);
$deliveredCount = 0;
foreach ($routeData["stops"] ?? [] as $stop) {
    if (($stop["status"] ?? "") === "delivered") {
        $deliveredCount++;
    }
}
$pendingCount = $total - $deliveredCount;

// Atualiza dados da rotina
$routeData["route_id"] = $routeId;
$routeData["status"] = "finished";
$routeData["motorista"] = $motorista;
$routeData["veiculo"] = $veiculo;
$routeData["finished_at"] = date("c");
$routeData["finished_data_formatada"] = date("d/m/Y H:i");
$routeData["observacoes_fechamento"] = $observacoes;
$routeData["delivered_stops"] = $deliveredCount;
$routeData["pending_stops"] = $pendingCount;
$routeData["completion_rate"] = $total > 0 ? round(($deliveredCount / $total) * 100, 1) : 100;

file_put_contents($filePath, json_encode($routeData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

// Registra no histórico corporativo de rotinas
$historyFile = dirname(__DIR__) . "/data/routes_history.json";
$history = [];
if (file_exists($historyFile)) {
    $history = json_decode(file_get_contents($historyFile), true) ?: [];
}

// Remove anterior se já existir
$history = array_values(array_filter($history, fn($item) => ($item["route_id"] ?? "") !== $routeId));

// Adiciona no topo
array_unshift($history, [
    "route_id" => $routeId,
    "created_at" => $routeData["created_at"] ?? date("c"),
    "finished_at" => $routeData["finished_at"],
    "data_formatada" => $routeData["finished_data_formatada"],
    "motorista" => $motorista,
    "veiculo" => $veiculo,
    "total_stops" => $total,
    "delivered_stops" => $deliveredCount,
    "pending_stops" => $pendingCount,
    "completion_rate" => $routeData["completion_rate"],
    "status" => "finished"
]);

// Mantém as últimas 100 rotinas
if (count($history) > 100) {
    $history = array_slice($history, 0, 100);
}

file_put_contents($historyFile, json_encode($history, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

jsonResponse([
    "success" => true,
    "message" => "Rotina de entregas finalizada e arquivada com sucesso!",
    "route_id" => $routeId,
    "delivered_stops" => $deliveredCount,
    "pending_stops" => $pendingCount,
    "total_stops" => $total,
    "completion_rate" => $routeData["completion_rate"],
    "finished_at" => $routeData["finished_data_formatada"]
]);
