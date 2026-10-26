<?php
declare(strict_types=1);

header_remove("X-Powered-By");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: no-referrer");
ini_set('display_errors','0');
require_once __DIR__ . '/runtime.php';
require_once __DIR__ . '/auth.php';
set_error_handler(function(int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) return false;
    throw new ErrorException($message,0,$severity,$file,$line);
});
set_exception_handler(function (Throwable $e): void {
    if ($e instanceof IdentityRejected) jsonResponse(['error'=>'Sessão ou credencial corporativa inválida.'],401);
    if ($e instanceof IdentityUnavailable) jsonResponse(['error'=>'Serviço de identidade indisponível ou não configurado.'],503);
    jsonResponse(['error'=>'Falha interna ao processar a solicitação.'],500);
});
$endpoint=basename($_SERVER['SCRIPT_NAME']??'');
$readOnly=in_array($endpoint,['get_route.php','get_history.php','search_company.php','geocode.php','auth_login.php','auth_callback.php','auth_session.php'],true);
if (($_SERVER['REQUEST_METHOD']??'GET')!==($readOnly?'GET':'POST')) {
    header('Allow: '.($readOnly?'GET':'POST')); jsonResponse(['error'=>'Método não permitido.'],405);
}
if (!in_array($endpoint,['get_route.php','update_route_status.php','finish_route.php','auth_login.php','auth_callback.php','auth_session.php','auth_logout.php'],true)) requireOperator();

// Environment takes precedence over the ignored, server-only .env file.
define('GEMINI_API_KEY', setting('GEMINI_API_KEY'));
const GEMINI_MODEL = "gemini-2.5-flash";

// Coordenadas centrais de Panambi - RS
const PANAMBI_DEFAULT_LAT = -28.2917;
const PANAMBI_DEFAULT_LON = -53.5019;

function jsonResponse(array $data, int $status = 200): void {
    header("Content-Type: application/json; charset=utf-8");
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit(0);
}

function getJsonBody(): array {
    $raw=file_get_contents('php://input',false,null,0,8388609);
    if (strlen($raw)>8388608) jsonResponse(['error'=>'Corpo muito grande.'],413);
    try { $object=json_decode($raw,false,64,JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { invalid('JSON inválido.'); }
    if (!is_object($object)) invalid('Objeto JSON obrigatório.');
    return json_decode($raw,true,64,JSON_THROW_ON_ERROR);
}

/**
 * Geocodifica um endereço usando Nominatim (OpenStreetMap)
 * Prioriza a região de Panambi / RS com normalização de vias conhecidas
 */
function geocodeAddress(string $query, string $municipio = "Panambi", string $uf = "RS"): ?array {
    $fullQuery = trim($query);

    // Dicionário de normalização de vias conhecidas em Panambi (ordenado do mais específico ao mais genérico)
    $streetAliases = [
        "rua richard saur" => "Rua Richard Sauer",
        "rua richard sauer" => "Rua Richard Sauer",
        "richard saur" => "Richard Sauer",
        "rua pres kennedy" => "Avenida Presidente Kennedy",
        "rua presidente kennedy" => "Avenida Presidente Kennedy",
        "av pres kennedy" => "Avenida Presidente Kennedy",
        "av. pres kennedy" => "Avenida Presidente Kennedy",
        "pres kennedy" => "Avenida Presidente Kennedy",
        "presidente kennedy" => "Avenida Presidente Kennedy",
        "av konrad adenauer" => "Avenida Konrad Adenauer",
        "av. konrad adenauer" => "Avenida Konrad Adenauer",
        "konrad adenauer" => "Konrad Adenauer",
        "rua bento goncalves" => "Rua Bento Gonçalves",
        "bento goncalves" => "Bento Gonçalves",
        "rua joao hepp" => "Rua João Hepp",
        "joao hepp" => "João Hepp"
    ];

    foreach ($streetAliases as $alias => $correct) {
        if (stripos($fullQuery, $alias) !== false) {
            $fullQuery = str_ireplace($alias, $correct, $fullQuery);
            break; // Evita duplicação ao casar termos contidos (ex: "pres kennedy" e "presidente kennedy")
        }
    }

    if (!str_contains(strtolower($fullQuery), strtolower($municipio))) {
        $fullQuery .= ", " . $municipio;
    }
    if (!str_contains(strtolower($fullQuery), strtolower($uf))) {
        $fullQuery .= " - " . $uf;
    }
    $fullQuery .= ", Brasil";

    $url = "https://nominatim.openstreetmap.org/search?" . http_build_query([
        "q" => $fullQuery,
        "format" => "json",
        "limit" => 1,
        "addressdetails" => 1,
        "countrycodes" => "br"
    ]);

    $opts = [
        "http" => [
            "method" => "GET",
            "header" => "User-Agent: PlaswillEntregasApp/1.0 (logistica@plaswill.com.br)\r\n",
            "timeout" => 4
        ]
    ];

    $ctx = stream_context_create($opts);
    $res = @file_get_contents($url, false, $ctx);
    if ($res) {
        $data = json_decode($res, true);
        if (!empty($data) && isset($data[0]["lat"], $data[0]["lon"])) {
            return [
                "lat" => (float) $data[0]["lat"],
                "lon" => (float) $data[0]["lon"],
                "display_name" => $data[0]["display_name"] ?? $fullQuery
            ];
        }
    }

    // Fallbacks inteligentes se a busca exata com número falhar
    $streetCandidates = [];
    if (preg_match('/^(.*?),\s*\d+/', $query, $m)) {
        $st = trim($m[1]);
        $streetCandidates[] = $st;
        // Tenta sem o prefixo de via (ex: tira "Rua " para casar com "Avenida", etc)
        $noPrefix = preg_replace('/^(rua|avenida|av\.?|travessa|rodovia|alameda)\s+/i', '', $st);
        if ($noPrefix !== $st) {
            $streetCandidates[] = $noPrefix;
        }
    }

    foreach ($streetCandidates as $cand) {
        foreach ($streetAliases as $alias => $correct) {
            if (stripos($cand, $alias) !== false) {
                $cand = str_ireplace($alias, $correct, $cand);
                break;
            }
        }
        $fallbackQuery = "{$cand}, {$municipio} - {$uf}, Brasil";
        $urlFallback = "https://nominatim.openstreetmap.org/search?" . http_build_query([
            "q" => $fallbackQuery,
            "format" => "json",
            "limit" => 1,
            "addressdetails" => 1,
            "countrycodes" => "br"
        ]);
        $resFb = @file_get_contents($urlFallback, false, $ctx);
        if ($resFb) {
            $dataFb = json_decode($resFb, true);
            if (!empty($dataFb) && isset($dataFb[0]["lat"], $dataFb[0]["lon"])) {
                return [
                    "lat" => (float) $dataFb[0]["lat"],
                    "lon" => (float) $dataFb[0]["lon"],
                    "display_name" => $dataFb[0]["display_name"] ?? $fallbackQuery
                ];
            }
        }
    }

    return null;
}
