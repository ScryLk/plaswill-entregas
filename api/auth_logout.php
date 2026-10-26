<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
if (authMode() !== 'oauth2') jsonResponse(['error' => 'Logout deve ser realizado no gateway corporativo.'], 409);
requireRequestOrigin();
openAuthSession();
$sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!isset($_SESSION['csrf']) || !is_string($sent) || !hash_equals($_SESSION['csrf'], $sent)) jsonResponse(['error' => 'Token CSRF inválido.'], 403);
$_SESSION = [];
session_destroy();
setcookie('__Host-plaswill_session', '', ['expires' => 1, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
jsonResponse(['success' => true]);
