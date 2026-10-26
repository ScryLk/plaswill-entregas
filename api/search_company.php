<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$query = trim($_GET["q"] ?? "");
if (empty($query)) {
    // Retorna as empresas da base local como sugestão padrão
    $companiesFile = __DIR__ . "/companies_db.json";
    $companies = file_exists($companiesFile) ? json_decode(file_get_contents($companiesFile), true) : [];
    jsonResponse(["success" => true, "results" => array_slice($companies, 0, 8)]);
}

$results = [];

// 1. Busca na base local de empresas
$companiesFile = __DIR__ . "/companies_db.json";
if (file_exists($companiesFile)) {
    $companies = json_decode(file_get_contents($companiesFile), true) ?: [];
    foreach ($companies as $comp) {
        $nameMatch = stripos($comp["nome"], $query) !== false;
        $fantasyMatch = !empty($comp["fantasia"]) && stripos($comp["fantasia"], $query) !== false;
        $streetMatch = !empty($comp["logradouro"]) && stripos($comp["logradouro"], $query) !== false;
        if ($nameMatch || $fantasyMatch || $streetMatch) {
            $results[] = $comp;
        }
    }
}

// 2. Se a busca local não tiver resultados suficientes, consulta o Gemini
if (count($results) < 3 && strlen($query) >= 3) {
    $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key=" . GEMINI_API_KEY;

    $prompt = <<<PROMPT
Você é um catálogo e mapa comercial de Panambi - RS e cidades vizinhas no Rio Grande do Sul.
O usuário está procurando por uma empresa/local de entrega digitando: "{$query}".

Retorne uma lista JSON com até 3 empresas ou estabelecimentos correspondentes na cidade de Panambi/RS ou região.
Formato exato:
[
  {
    "nome": "Razão Social ou Nome Completo",
    "fantasia": "Nome Popular ou Comercial",
    "logradouro": "Nome da Rua ou Avenida",
    "numero": "Número do Imóvel",
    "bairro": "Bairro em Panambi",
    "municipio": "Panambi",
    "uf": "RS",
    "cep": "98280-000"
  }
]

Se não conhecer com certeza, retorne a melhor correspondência estimada em Panambi/RS.
Retorne APENAS o JSON válido, sem markdown ou explicações.
PROMPT;

    $payload = [
        "contents" => [
            ["parts" => [["text" => $prompt]]]
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
        CURLOPT_TIMEOUT => 6
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response && $httpCode === 200) {
        $geminiData = json_decode($response, true);
        $rawText = $geminiData["candidates"][0]["content"]["parts"][0]["text"] ?? "[]";
        $aiList = json_decode($rawText, true);

        if (is_array($aiList)) {
            foreach ($aiList as $item) {
                if (empty($item["nome"])) continue;

                // Geocodifica para obter coordenadas
                $streetQuery = trim(($item["logradouro"] ?? "") . ", " . ($item["numero"] ?? "") . ", " . ($item["bairro"] ?? ""));
                $geo = geocodeAddress($streetQuery, $item["municipio"] ?? "Panambi", $item["uf"] ?? "RS");

                $lat = $geo ? $geo["lat"] : (PANAMBI_DEFAULT_LAT + (mt_rand(-30, 30) / 10000));
                $lon = $geo ? $geo["lon"] : (PANAMBI_DEFAULT_LON + (mt_rand(-30, 30) / 10000));

                $results[] = [
                    "id" => "ai_" . uniqid(),
                    "nome" => $item["nome"],
                    "fantasia" => $item["fantasia"] ?? $item["nome"],
                    "logradouro" => $item["logradouro"] ?? "",
                    "numero" => $item["numero"] ?? "",
                    "bairro" => $item["bairro"] ?? "",
                    "municipio" => $item["municipio"] ?? "Panambi",
                    "uf" => $item["uf"] ?? "RS",
                    "cep" => $item["cep"] ?? "98280-000",
                    "lat" => $lat,
                    "lon" => $lon,
                    "tipo" => "ai_search"
                ];
            }
        }
    }
}

jsonResponse([
    "success" => true,
    "query" => $query,
    "count" => count($results),
    "results" => $results
]);
