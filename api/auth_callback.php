<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
$config = oauthConfig();
openAuthSession();
$pending = $_SESSION['oauth_pending'] ?? [];
unset($_SESSION['oauth_pending']); // One use, including failed or cancelled exchanges.
$state = $_GET['state'] ?? null;
if (!is_string($state) || !preg_match('/^[a-f0-9]{64}$/D', $state) || ($pending['expires_at'] ?? 0) <= time() || !hash_equals($pending['state'] ?? '', $state)) {
    jsonResponse(['error' => 'Solicitação de login inválida ou expirada. Inicie novamente.'], 400);
}
if (isset($_GET['error'])) jsonResponse(['error' => 'Autorização não concluída no GED.'], 401);
$code = $_GET['code'] ?? null;
if (!is_string($code) || $code === '' || strlen($code) > 4096 || preg_match('/[\x00-\x20\x7f]/', $code)) invalid('Código de autorização inválido.');
$token = gedRequest($config['base'] . '/apps/oauth2/api/v1/token', [
    'grant_type' => 'authorization_code', 'client_id' => $config['client_id'],
    'client_secret' => $config['client_secret'], 'redirect_uri' => $config['redirect'], 'code' => $code,
]);
if (strtolower($token['token_type'] ?? '') !== 'bearer' || !is_string($token['access_token'] ?? null) || !is_string($token['user_id'] ?? null) || !is_int($token['expires_in'] ?? null) || $token['expires_in'] <= 0) throw new IdentityRejected();
$identity = gedIdentity($token['access_token'], $token['user_id']);
if (!$identity['roles']) jsonResponse(['error' => 'Usuário sem grupo autorizado no Entregas.'], 403);
if (!session_regenerate_id(true)) throw new IdentityUnavailable();
$_SESSION['identity'] = ['id' => $identity['id'], 'access_token' => $token['access_token'],
    'expires_at' => time() + min($token['expires_in'], 28800), 'created_at' => time(), 'last_seen' => time()];
$_SESSION['csrf'] = bin2hex(random_bytes(32));
// Refresh tokens are deliberately not retained; expiry requires a new authorization.
session_write_close();
header('Location: ' . $config['origin'] . '/', true, 303);
