<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
$mode = authMode();
try { $principal = requestPrincipal(); }
catch (IdentityRejected $e) { $principal = null; }
catch (IdentityUnavailable $e) {
    // A local logout nonce does not grant identity or data access while GED is down.
    $canLogout = isset($_SESSION['identity'], $_SESSION['csrf']);
    jsonResponse(['authenticated'=>false,'mode'=>$mode,'login_available'=>false,
        'logout_available'=>$canLogout,'csrf_token'=>$canLogout ? $_SESSION['csrf'] : null,
        'error'=>'Serviço de identidade indisponível.'],503);
}
$available = false;
if ($mode === 'oauth2') {
    try { oauthConfig(); $available = true; } catch (IdentityUnavailable $e) { /* Presence only, no values returned. */ }
}
jsonResponse(['authenticated' => $principal !== null, 'login_available' => $available,
    'logout_available' => $principal !== null && $mode === 'oauth2', 'mode' => $mode, 'user' => $principal === null ? null : ['id' => $principal['id'], 'roles' => $principal['roles']],
    'csrf_token' => $principal !== null && $mode === 'oauth2' ? ($_SESSION['csrf'] ?? null) : null]);
