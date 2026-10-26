<?php
declare(strict_types=1);
require_once __DIR__ . '/settings.php';

const GED_DEFAULT_GROUPS = [
    'operator' => ['Logistica', 'Producao', 'admin'],
    'supervisor' => ['Comercial', 'Diretoria', 'Financeiro'],
    'administrator' => ['admin', 'Diretoria'],
];

final class IdentityUnavailable extends RuntimeException {}
final class IdentityRejected extends RuntimeException {}

function authMode(): string {
    $mode = setting('GED_AUTH_TYPE', 'gateway');
    if (!in_array($mode, ['oauth2', 'gateway'], true)) throw new IdentityUnavailable();
    return $mode;
}
function httpsUrl(string $url, bool $allowQuery = false): array {
    $p = parse_url($url);
    if (!$p || ($p['scheme'] ?? '') !== 'https' || empty($p['host']) || isset($p['user']) || isset($p['pass']) || (!$allowQuery && isset($p['query'])) || isset($p['fragment'])) throw new IdentityUnavailable();
    return $p;
}
function urlOrigin(array $p): string {
    return 'https://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
}
function oauthConfig(): array {
    if (authMode() !== 'oauth2') throw new IdentityUnavailable();
    $base = rtrim(setting('GED_BASE_URL'), '/');
    httpsUrl($base);
    $redirect = setting('GED_REDIRECT_URI');
    $r = httpsUrl($redirect);
    if (!str_ends_with($r['path'] ?? '', '/api/auth_callback.php')) throw new IdentityUnavailable();
    $origin = setting('ENTREGAS_PUBLIC_ORIGIN', urlOrigin($r));
    $o = httpsUrl($origin);
    if (($o['path'] ?? '') !== '' || urlOrigin($o) !== urlOrigin($r)) throw new IdentityUnavailable();
    $id = setting('GED_CLIENT_ID');
    $secret = setting('GED_CLIENT_SECRET');
    if ($id === '' || $secret === '' || $secret === 'configurado_no_servidor_seguro') throw new IdentityUnavailable();
    return ['base' => $base, 'redirect' => $redirect, 'origin' => $origin, 'client_id' => $id, 'client_secret' => $secret];
}
function publicOrigin(): string {
    return authMode() === 'oauth2' ? oauthConfig()['origin'] : setting('ENTREGAS_PUBLIC_ORIGIN');
}
function rolesForGroups(array $groups): array {
    $raw = setting('ENTREGAS_ROLE_GROUPS');
    $mapping = $raw === '' ? (authMode() === 'oauth2' ? GED_DEFAULT_GROUPS : []) : json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($mapping)) throw new IdentityUnavailable();
    $roles = [];
    foreach (['operator', 'supervisor', 'administrator'] as $role) {
        $allowed = $mapping[$role] ?? [];
        if (!is_array($allowed) || !array_is_list($allowed)) throw new IdentityUnavailable();
        foreach ($allowed as $group) if (!is_string($group) || $group === '') throw new IdentityUnavailable();
        if (array_intersect($groups, $allowed)) $roles[] = $role;
    }
    return $roles;
}
function rolesPermit(array $roles, string $permission): bool {
    $allowed = match ($permission) {
        'route.read', 'history.read' => ['operator', 'supervisor', 'administrator'],
        'route.write', 'dispatch', 'catalog', 'geocode', 'optimize', 'danfe' => ['operator', 'administrator'],
        'admin' => ['administrator'],
        default => [],
    };
    return (bool) array_intersect($roles, $allowed);
}
function permissionForEndpoint(): string {
    return match (basename($_SERVER['SCRIPT_NAME'] ?? '')) {
        'get_route.php', 'routine_read.php' => 'route.read',
        'get_history.php' => 'history.read',
        'search_company.php' => 'catalog',
        'geocode.php' => 'geocode',
        'optimize_sequence.php' => 'optimize',
        'process_danfe.php' => 'danfe',
        'save_route.php', 'issue_route_access.php', 'revoke_route.php', 'routine_write.php' => 'dispatch',
        'update_route_status.php', 'finish_route.php' => 'route.write',
        default => 'deny',
    };
}
function openAuthSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $path = dataDir() . '/sessions';
    if (!is_dir($path) && !mkdir($path, 0700, true)) throw new IdentityUnavailable();
    if (!is_writable($path)) throw new IdentityUnavailable();
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', '28800');
    session_save_path($path);
    session_name('__Host-plaswill_session');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'domain' => '', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
    if (!session_start()) throw new IdentityUnavailable();
}
/** Bounded HTTPS-only requests. No redirects, no insecure internal URL fallback. */
function gedRequest(string $url, ?array $form = null, ?string $token = null): array {
    httpsUrl($url, true);
    $curl = curl_init($url);
    $body = '';
    $headers = ['Accept: application/json', 'OCS-APIRequest: true'];
    if ($token !== null) {
        if ($token === '' || strlen($token) > 16384 || preg_match('/[\x00-\x20\x7f]/', $token)) throw new IdentityRejected();
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    $options = [
        CURLOPT_HTTPHEADER => $headers, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_WRITEFUNCTION => function ($handle, string $chunk) use (&$body): int {
            if (strlen($body) + strlen($chunk) > 1048576) return 0;
            $body .= $chunk; return strlen($chunk);
        },
    ];
    if (defined('CURLOPT_PROTOCOLS_STR')) $options[constant('CURLOPT_PROTOCOLS_STR')] = 'HTTPS';
    else $options[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS;
    if ($form !== null) {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = http_build_query($form, '', '&', PHP_QUERY_RFC3986);
    }
    $ca = setting('GED_CA_BUNDLE');
    if ($ca !== '') $options[CURLOPT_CAINFO] = $ca;
    curl_setopt_array($curl, $options);
    $ok = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if (in_array($status, [400, 401, 403], true)) throw new IdentityRejected();
    if ($ok === false || $status !== 200) throw new IdentityUnavailable();
    try { $result = json_decode($body, true, 64, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { throw new IdentityUnavailable(); }
    if (!is_array($result) || array_is_list($result)) throw new IdentityUnavailable();
    return $result;
}
function ocsData(array $response): array {
    $meta = $response['ocs']['meta'] ?? null;
    $data = $response['ocs']['data'] ?? null;
    if (!is_array($meta) || ($meta['status'] ?? '') !== 'ok' || !in_array($meta['statuscode'] ?? null, [100, 200], true) || !is_array($data)) throw new IdentityRejected();
    return $data;
}
function gedIdentity(string $token, ?string $expectedUser = null): array {
    $base = oauthConfig()['base'];
    $user = ocsData(gedRequest($base . '/ocs/v1.php/cloud/user?format=json', null, $token));
    $id = $user['id'] ?? null;
    if (!is_string($id) || $id === '' || strlen($id) > 255 || preg_match('/[\x00-\x1f\x7f]/', $id) || ($user['enabled'] ?? true) === false || ($expectedUser !== null && $id !== $expectedUser)) throw new IdentityRejected();
    $groupData = ocsData(gedRequest($base . '/ocs/v1.php/cloud/users/' . rawurlencode($id) . '/groups?format=json', null, $token));
    $groups = $groupData['groups'] ?? null;
    if (!is_array($groups) || !array_is_list($groups) || count($groups) > 1000) throw new IdentityRejected();
    foreach ($groups as $group) if (!is_string($group) || strlen($group) > 255) throw new IdentityRejected();
    $roles = rolesForGroups($groups);
    return ['id' => $id, 'roles' => $roles];
}
function dropLocalIdentity(): void {
    unset($_SESSION['identity'], $_SESSION['csrf'], $_SESSION['oauth_pending']);
}
/** Null means no session. Provider failures never enable gateway/public fallback. */
function requestPrincipal(): ?array {
    static $checked = false, $principal;
    if ($checked) return $principal;
    $checked = true;
    if (authMode() === 'gateway') {
        $id = $_SERVER['REMOTE_USER'] ?? '';
        return $principal = $id === '' ? null : ['id' => $id, 'roles' => rolesForGroups(explode(',', $_SERVER['REMOTE_GROUPS'] ?? '')), 'mode' => 'gateway'];
    }
    // Avoid creating a session directory/cookie for anonymous route-capability requests.
    if (!isset($_COOKIE['__Host-plaswill_session'])) return null;
    openAuthSession();
    $auth = $_SESSION['identity'] ?? null;
    if (!is_array($auth)) return null;
    $now = time();
    if (($auth['expires_at'] ?? 0) <= $now || ($auth['last_seen'] ?? 0) + 1800 <= $now || ($auth['created_at'] ?? 0) + 28800 <= $now) {
        dropLocalIdentity(); return null;
    }
    try { $identity = gedIdentity($auth['access_token'], $auth['id']); }
    catch (IdentityRejected $e) { dropLocalIdentity(); throw $e; }
    $_SESSION['identity']['last_seen'] = $now;
    return $principal = $identity + ['mode' => 'oauth2'];
}
function requireRequestOrigin(): void {
    $origin = publicOrigin();
    if ($origin === '') throw new IdentityUnavailable();
    if (($_SERVER['HTTP_ORIGIN'] ?? '') !== $origin) jsonResponse(['error' => 'Origem não autorizada.'], 403);
}
function requireCorporatePermission(string $permission): void {
    $p = requestPrincipal();
    if ($p === null) jsonResponse(['error' => 'Autenticação corporativa necessária.'], 401);
    if (!rolesPermit($p['roles'], $permission)) jsonResponse(['error' => 'Sem permissão.'], 403);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        requireRequestOrigin();
        if ($p['mode'] === 'oauth2') {
            $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            if (!is_string($sent) || !isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $sent)) jsonResponse(['error' => 'Token CSRF inválido.'], 403);
        }
    }
}
