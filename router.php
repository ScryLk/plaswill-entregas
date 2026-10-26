<?php
// Development router only. Production must enforce equivalent deny rules at the web server.
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
$root=realpath(__DIR__); $file=realpath(__DIR__.$path);
$endpoint=preg_match('#^/api/(routine_read|routine_write|auth_login|auth_callback|auth_session|auth_logout|get_route|get_history|save_route|update_route_status|finish_route|revoke_route|issue_route_access|search_company|geocode|optimize_sequence|process_danfe)\.php$#D',$path);
$static=$file && str_starts_with($file,$root.DIRECTORY_SEPARATOR) && preg_match('#^/(index\.html|motorista\.html|routines\.js|routines\.css|app\.js|session\.js|motorista\.js|outbox\.js|sw\.js|style\.css|motorista\.css|manifest\.json|driver\.webmanifest|origin\.json|qrcode\.min\.js|(?:img|icons)/[A-Za-z0-9_.-]+)$#D',$path);
header('Referrer-Policy: no-referrer');
if ($endpoint) { require __DIR__.$path; return true; }
if ($static || $path==='/') return false;
http_response_code(404); return true;
