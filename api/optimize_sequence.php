<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$body = getJsonBody();
$stops = $body["stops"] ?? [];
$origin = $body["origin"] ?? [
    "lat" => -28.2745,
    "lon" => -53.5182,
    "name" => "Plaswill Indústria"
];

if (empty($stops) || !is_array($stops)) {
    jsonResponse(["error" => "Lista de paradas vazia."], 400);
}

// Heurística do Vizinho Mais Próximo (Nearest Neighbor) para ordenar as paradas
function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $earthRadius = 6371; // km
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon / 2) * sin($dLon / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c;
}

$unvisited = $stops;
$ordered = [];
$currentLat = (float)($origin["lat"] ?? PANAMBI_DEFAULT_LAT);
$currentLon = (float)($origin["lon"] ?? PANAMBI_DEFAULT_LON);

while (!empty($unvisited)) {
    $nearestIndex = null;
    $minDistance = INF;

    foreach ($unvisited as $idx => $stop) {
        $stopLat = (float)($stop["lat"] ?? PANAMBI_DEFAULT_LAT);
        $stopLon = (float)($stop["lon"] ?? PANAMBI_DEFAULT_LON);
        $dist = haversineDistance($currentLat, $currentLon, $stopLat, $stopLon);

        if ($dist < $minDistance) {
            $minDistance = $dist;
            $nearestIndex = $idx;
        }
    }

    if ($nearestIndex !== null) {
        $selected = $unvisited[$nearestIndex];
        $ordered[] = $selected;
        $currentLat = (float)($selected["lat"] ?? $currentLat);
        $currentLon = (float)($selected["lon"] ?? $currentLon);
        unset($unvisited[$nearestIndex]);
        $unvisited = array_values($unvisited);
    } else {
        break;
    }
}

jsonResponse([
    "success" => true,
    "ordered_stops" => $ordered,
    "count" => count($ordered)
]);
