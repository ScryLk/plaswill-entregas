<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$historyFile = dirname(__DIR__) . "/data/routes_history.json";
$history = [];

if (file_exists($historyFile)) {
    $history = json_decode(file_get_contents($historyFile), true) ?: [];
}

jsonResponse([
    "success" => true,
    "total" => count($history),
    "history" => $history
]);
