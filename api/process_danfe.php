<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
if ($method !== "POST") {
    jsonResponse(["error" => "Método não permitido. Use POST."], 405);
}

// 1. Obter os dados da imagem (Upload ou Base64)
$base64Data = "";
$mimeType = "image/png";

if (!empty($_FILES["file"]["tmp_name"])) {
    $tmpPath = $_FILES["file"]["tmp_name"];
    $mimeType = mime_content_type($tmpPath) ?: "image/jpeg";
    $rawBytes = file_get_contents($tmpPath);
    if ($rawBytes === false) {
        jsonResponse(["error" => "Falha ao ler arquivo enviado."], 400);
    }
    $base64Data = base64_encode($rawBytes);
} else {
    $input = getJsonBody();
    if (!empty($input["image_base64"])) {
        $base64Data = $input["image_base64"];
        // Remove prefixo data URI se existir
        if (preg_match('/^data:([a-zA-Z0-9\/\+]+);base64,(.+)$/', $base64Data, $matches)) {
            $mimeType = $matches[1];
            $base64Data = $matches[2];
        }
        if (!empty($input["mime_type"])) {
            $mimeType = $input["mime_type"];
        }
    }
}

if (empty($base64Data)) {
    jsonResponse(["error" => "Nenhuma imagem ou nota fiscal fornecida."], 400);
}

// 2. Chamar o Google Gemini Vision (gemini-2.5-flash)
$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key=" . GEMINI_API_KEY;

$prompt = <<<PROMPT
Você é um leitor especialista de DANFEs e Notas Fiscais Eletrônicas brasileiras (NF-e).
Analise a imagem da nota fiscal e extraia com máxima fidelidade os dados do destinatário e da entrega.

Retorne estritamente um JSON no seguinte formato:
{
  "numero_nota": "número da nota ou DANFE",
  "serie": "série se houver",
  "emitente": "razão social do emitente",
  "destinatario": "razão social completa do destinatário",
  "nome_fantasia": "nome fantasia ou comercial do destinatário se identificável",
  "cnpj_destinatario": "CNPJ ou CPF do destinatário",
  "endereco": {
    "logradouro": "nome da rua ou avenida",
    "numero": "número do imóvel",
    "complemento": "complemento se houver",
    "bairro": "bairro",
    "municipio": "cidade (ex: Panambi)",
    "uf": "sigla do estado (ex: RS)",
    "cep": "CEP formatado"
  },
  "itens_resumo": "resumo dos produtos e volumes (ex: 1 rolo plástico bolha 50 micras)",
  "observacoes_entrega": "qualquer observação de entrega ou horário mencionada"
}

Retorne APENAS o JSON válido, sem comentários ou markdown.
PROMPT;

$payload = [
    "contents" => [
        [
            "parts" => [
                ["text" => $prompt],
                [
                    "inline_data" => [
                        "mime_type" => $mimeType,
                        "data" => $base64Data
                    ]
                ]
            ]
        ]
    ],
    "generationConfig" => [
        "response_mime_type" => "application/json",
        "temperature" => 0.1
    ]
];

$ch = curl_init($geminiUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 25
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    jsonResponse([
        "error" => "Falha na comunicação com IA Gemini Vision.",
        "details" => $curlError ?: $response,
        "code" => $httpCode
    ], 502);
}

$geminiData = json_decode($response, true);
$rawText = $geminiData["candidates"][0]["content"]["parts"][0]["text"] ?? "{}";
$extracted = json_decode($rawText, true);

if (empty($extracted) || empty($extracted["destinatario"])) {
    jsonResponse([
        "error" => "Não foi possível extrair os dados da nota fiscal.",
        "raw" => $rawText
    ], 422);
}

// 3. Geocodificação das Coordenadas (Lat / Lon)
$municipio = $extracted["endereco"]["municipio"] ?? "Panambi";
$uf = $extracted["endereco"]["uf"] ?? "RS";
$logradouro = $extracted["endereco"]["logradouro"] ?? "";
$numero = $extracted["endereco"]["numero"] ?? "";
$bairro = $extracted["endereco"]["bairro"] ?? "";
$destinatario = $extracted["destinatario"] ?? "";

// A) Tenta na base local de empresas primeiro
$companiesFile = __DIR__ . "/companies_db.json";
$matchedCompany = null;
if (file_exists($companiesFile)) {
    $companies = json_decode(file_get_contents($companiesFile), true) ?: [];
    foreach ($companies as $comp) {
        $nameMatch = stripos($destinatario, $comp["nome"]) !== false || stripos($comp["nome"], $destinatario) !== false;
        $fantasyMatch = !empty($comp["fantasia"]) && stripos($destinatario, $comp["fantasia"]) !== false;
        if ($nameMatch || $fantasyMatch) {
            $matchedCompany = $comp;
            break;
        }
    }
}

$lat = null;
$lon = null;
$geocodedBy = "approximate";

// Se a empresa na base local tiver coordenadas válidas que NÃO sejam as coordenadas genéricas do centro
$isGenericDbCoord = false;
if ($matchedCompany && isset($matchedCompany["lat"], $matchedCompany["lon"])) {
    $cLat = (float) $matchedCompany["lat"];
    $cLon = (float) $matchedCompany["lon"];
    if (abs($cLat - PANAMBI_DEFAULT_LAT) < 0.0001 && abs($cLon - PANAMBI_DEFAULT_LON) < 0.0001) {
        $isGenericDbCoord = true;
    }
}

if ($matchedCompany && isset($matchedCompany["lat"], $matchedCompany["lon"]) && !$isGenericDbCoord) {
    $lat = (float) $matchedCompany["lat"];
    $lon = (float) $matchedCompany["lon"];
    $geocodedBy = "local_db";
} else {
    // B) Consulta Nominatim com endereço completo
    $addressQuery = trim("{$logradouro}, {$numero}, {$bairro}");
    $geoResult = geocodeAddress($addressQuery, $municipio, $uf);
    if ($geoResult) {
        $lat = $geoResult["lat"];
        $lon = $geoResult["lon"];
        $geocodedBy = "nominatim_exact";
    } else {
        // Tenta apenas com Rua e Cidade
        $geoResultRua = geocodeAddress("{$logradouro}", $municipio, $uf);
        if ($geoResultRua) {
            $lat = $geoResultRua["lat"];
            $lon = $geoResultRua["lon"];
            $geocodedBy = "nominatim_street";
        } else {
            // Coordenadas com pequeno deslocamento radial para nunca colidir
            $angle = mt_rand(0, 360) * (M_PI / 180);
            $dist = 0.003 + (mt_rand(0, 20) / 10000);
            $lat = PANAMBI_DEFAULT_LAT + (sin($angle) * $dist);
            $lon = PANAMBI_DEFAULT_LON + (cos($angle) * $dist);
            $geocodedBy = "default_center_jitter";
        }
    }
}

// 4. Montar o Objeto Padronizado da Entrega
$deliveryId = "del_" . uniqid() . "_" . mt_rand(100, 999);
$addressDisplay = trim("{$logradouro}, {$numero}" . ($bairro ? " - {$bairro}" : "") . ", {$municipio} - {$uf}");

$delivery = [
    "id" => $deliveryId,
    "destinatario" => $destinatario,
    "nome_fantasia" => $extracted["nome_fantasia"] ?? $destinatario,
    "numero_nota" => $extracted["numero_nota"] ?? "",
    "serie" => $extracted["serie"] ?? "",
    "emitente" => $extracted["emitente"] ?? "",
    "cnpj" => $extracted["cnpj_destinatario"] ?? "",
    "logradouro" => $logradouro,
    "numero" => $numero,
    "bairro" => $bairro,
    "municipio" => $municipio,
    "uf" => $uf,
    "cep" => $extracted["endereco"]["cep"] ?? "",
    "endereco_completo" => $addressDisplay,
    "itens_resumo" => $extracted["itens_resumo"] ?? "",
    "observacoes" => $extracted["observacoes_entrega"] ?? "",
    "lat" => $lat,
    "lon" => $lon,
    "status" => "pending", // pending | delivered
    "geocoded_by" => $geocodedBy,
    "created_at" => date("c")
];

jsonResponse([
    "success" => true,
    "delivery" => $delivery
]);
