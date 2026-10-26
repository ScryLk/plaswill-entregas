<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
$config = oauthConfig();
openAuthSession();
dropLocalIdentity();
if (!session_regenerate_id(true)) throw new IdentityUnavailable();
$state = bin2hex(random_bytes(32));
$_SESSION['oauth_pending'] = ['state' => $state, 'expires_at' => time() + 300];
$authorize = $config['base'] . '/apps/oauth2/authorize?' . http_build_query([
    'response_type' => 'code', 'client_id' => $config['client_id'],
    'redirect_uri' => $config['redirect'], 'state' => $state,
], '', '&', PHP_QUERY_RFC3986);
session_write_close();
header('Location: ' . $authorize, true, 303);
