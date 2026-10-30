<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

if (($_GET['mode']??'')==='catalog') {
    require_once __DIR__.'/catalog.php';
    jsonResponse(catalogResults($_GET));
}
$query = textField($_GET["q"] ?? "", 300);
if (empty($query)) {
    require_once __DIR__.'/catalog.php';
    jsonResponse(catalogResults(['per_page'=>'8']));
}

require_once __DIR__.'/catalog.php';
$results=catalogResults(['q'=>$query,'per_page'=>'20'])['results'];

// 2. Se a busca local não tiver resultados suficientes, consulta o Gemini
if (($_GET['ai']??'')==='1' && GEMINI_API_KEY && count($results) < 3 && strlen($query) >= 3) {
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

Se não conhecer com certeza, retorne uma lista vazia. Não invente estabelecimentos ou endereços.
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
                if (!is_array($item) || !is_string($item['nome']??null) || trim($item['nome'])==='') continue;
                $valid=true;
                foreach (['nome','fantasia','logradouro','numero','bairro','municipio','uf','cep'] as $key) {
                    if (isset($item[$key]) && (!is_string($item[$key]) || strlen($item[$key])>500)) { $valid=false;break; }
                }
                if (!$valid) continue;

                // Geocodifica para obter coordenadas
                $streetQuery = trim(($item["logradouro"] ?? "") . ", " . ($item["numero"] ?? "") . ", " . ($item["bairro"] ?? ""));
                $geo = geocodeAddress($streetQuery, $item["municipio"] ?? "Panambi", $item["uf"] ?? "RS");

                $lat = $geo ? $geo["lat"] : null;
                $lon = $geo ? $geo["lon"] : null;

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
                    "tipo" => "ai_search",
                    "source" => "ai_suggestion",
                    "needs_review" => true,
                    "geocoded_by" => $geo ? "nominatim_suggestion" : "unresolved"
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
