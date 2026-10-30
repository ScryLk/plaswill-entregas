<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';
require_once __DIR__.'/routines.php';

requireOperator();
$actor = requestPrincipal()['id'] ?? '';
if (!is_string($actor) || !preg_match('/^[a-zA-Z0-9_.-]{1,100}$/D', $actor)) {
    invalid('Identificador de usuário inválido.');
}

$draftDir = dataDir() . '/drafts';
if (!is_dir($draftDir) && !mkdir($draftDir, 0700, true) && !is_dir($draftDir)) {
    throw new RuntimeException('Não foi possível criar o diretório de rascunhos.');
}
$draftFile = $draftDir . '/' . hash('sha256', $actor) . '.json';

$body = getJsonBody();
$action = $body['action'] ?? 'save';

if ($action === 'clear') {
    storeLock(function() use ($draftFile) {
        if (is_file($draftFile)) {
            @unlink($draftFile);
        }
    });
    jsonResponse(['success' => true, 'cleared' => true]);
}

if ($action === 'save') {
    $stops = planningStops($body['stops'] ?? []);
    $origin = $body['origin'] ?? null;
    if ($origin !== null) {
        validateOrigin($origin);
    }
    $routeId = $body['active_route_id'] ?? null;
    if ($routeId !== null && (!is_string($routeId) || !preg_match('/^ROT-[A-Z0-9]{4}$/D', $routeId))) {
        $routeId = null;
    }

    $doc = [
        'actor' => $actor,
        'updated_at' => date('c'),
        'data_formatada' => date('d/m/Y H:i'),
        'origin' => $origin,
        'stops' => $stops,
        'active_route_id' => $routeId,
    ];

    storeLock(function() use ($draftFile, $doc) {
        atomicDocument($draftFile, $doc);
    });

    jsonResponse(['success' => true, 'updated_at' => $doc['updated_at'], 'total_stops' => count($stops)]);
}

invalid('Ação de rascunho inválida.');
