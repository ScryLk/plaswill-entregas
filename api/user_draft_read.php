<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';

requireOperator();
$actor = requestPrincipal()['id'] ?? '';
if (!is_string($actor) || !preg_match('/^[a-zA-Z0-9_.-]{1,100}$/D', $actor)) {
    invalid('Identificador de usuário inválido.');
}

$draftDir = dataDir() . '/drafts';
$draftFile = $draftDir . '/' . hash('sha256', $actor) . '.json';

$draft = storeLock(function() use ($draftFile, $actor) {
    if (!is_file($draftFile)) return null;
    $doc = readDocument($draftFile);
    if (($doc['actor'] ?? null) !== $actor) return null;
    return $doc;
});

jsonResponse(['success' => true, 'actor' => $actor, 'draft' => $draft]);
