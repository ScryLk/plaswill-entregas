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
$readOnly=in_array($endpoint,['get_route.php','get_history.php','search_company.php','geocode.php','auth_login.php','auth_callback.php','auth_session.php','routine_read.php','user_draft_read.php'],true);
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
    $municipio = trim($municipio) ?: "Panambi";
    $uf = strtoupper(trim($uf) ?: "RS");
    $rawQuery = trim($query);

    // Dicionário de normalização de vias conhecidas em Panambi e região
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
        "joao hepp" => "João Hepp",
        "rua gal osorio" => "Rua General Osório",
        "rua gal. osorio" => "Rua General Osório",
        "gal osorio" => "General Osório",
        "av dos imigrantes" => "Avenida dos Imigrantes",
        "av. dos imigrantes" => "Avenida dos Imigrantes",
        "rua 7 de setembro" => "Rua Sete de Setembro"
    ];

    $applyAliases = function (string $str) use ($streetAliases): string {
        foreach ($streetAliases as $alias => $correct) {
            if (stripos($str, $alias) !== false) {
                return str_ireplace($alias, $correct, $str);
            }
        }
        return $str;
    };

    // Limpa sufixos de sem número (S/N, SN, SEM NUMERO, 0) e bairros genéricos acoplados
    $cleaned = preg_replace('/,\s*(s\/?n[º°]?|sem\s*n[uú]mero|0)(\b|,|$)/iu', '', $rawQuery);
    $cleaned = preg_replace('/,\s*(centro|interior|zona\s*rural|industrial|distrito\s*industrial)\s*$/iu', '', trim($cleaned));
    $cleaned = trim($applyAliases($cleaned), " ,-");

    $candidates = [];
    if ($cleaned !== '') {
        $candidates[] = $cleaned;
    }

    // Se contiver rodovia (ex: RODOVIA BR 285 - KM 445, ESTRADA BR 285, ROD BR 158, ERS 155)
    if (preg_match('/\b(br|ers|rst|rs)[\s\-]*(\d{3})\b/i', $rawQuery, $hm)) {
        $prefix = strtoupper($hm[1]) === 'BR' ? 'BR' : 'RS';
        $num = $hm[2];
        $candidates[] = "{$prefix}-{$num}";
        $candidates[] = "{$prefix} {$num}";
    }

    // Remove marcações de KM (ex: "- KM 445", "KM 42") e número do imóvel para buscar a via
    $noKmAndNum = preg_replace('/[\s,\-]*km\s*\d+([.,]\d+)?/iu', '', $cleaned);
    $noKmAndNum = preg_replace('/,\s*\d+[A-Za-z]?\s*$/u', '', trim($noKmAndNum));
    $noKmAndNum = trim($noKmAndNum, " ,-");
    if ($noKmAndNum !== '' && !in_array($noKmAndNum, $candidates, true)) {
        $candidates[] = $noKmAndNum;
    }

    // Tenta também sem o tipo de logradouro (Rua, Avenida, Rodovia, Estrada, Log, etc.)
    $noPrefix = preg_replace('/^(rua|avenida|av\.?|travessa|rodovia|rod\.?|estrada|alameda|log\.?|eim|nur)\s+/iu', '', $noKmAndNum);
    $noPrefix = trim($noPrefix, " ,-");
    if ($noPrefix !== '' && $noPrefix !== $noKmAndNum && !in_array($noPrefix, $candidates, true)) {
        $candidates[] = $noPrefix;
    }

    $opts = [
        "http" => [
            "method" => "GET",
            "header" => "User-Agent: PlaswillEntregasApp/1.1 (logistica@plaswill.com.br)\r\n",
            "timeout" => 4
        ]
    ];
    $ctx = stream_context_create($opts);

    $queryNominatim = function (array $params) use ($ctx): ?array {
        $url = "https://nominatim.openstreetmap.org/search?" . http_build_query($params + [
            "format" => "json",
            "limit" => 1,
            "addressdetails" => 1,
            "countrycodes" => "br"
        ]);
        $res = @file_get_contents($url, false, $ctx);
        if (!$res) return null;
        $data = json_decode($res, true);
        if (!empty($data) && isset($data[0]["lat"], $data[0]["lon"])) {
            return [
                "lat" => (float) $data[0]["lat"],
                "lon" => (float) $data[0]["lon"],
                "display_name" => $data[0]["display_name"] ?? ""
            ];
        }
        return null;
    };

    foreach ($candidates as $cand) {
        // 1. Busca estruturada por street + city + state (evita confundir cidade com nome de rua em outra cidade)
        $hit = $queryNominatim([
            "street" => $cand,
            "city" => $municipio,
            "state" => $uf
        ]);
        if ($hit) return $hit;

        // 2. Busca textual livre com município e UF
        $fullCand = $cand;
        if (!str_contains(strtolower($fullCand), strtolower($municipio))) {
            $fullCand .= ", " . $municipio;
        }
        if (!str_contains(strtolower($fullCand), strtolower($uf))) {
            $fullCand .= " - " . $uf;
        }
        $fullCand .= ", Brasil";

        $hit = $queryNominatim(["q" => $fullCand]);
        if ($hit) return $hit;
    }

    // Sem correspondência de endereço, mantenha pendente para revisão humana.
    // O centro do município e deslocamentos artificiais não identificam o destinatário.
    return null;
}
