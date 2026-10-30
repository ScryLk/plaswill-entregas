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
        if (!is_string($input["image_base64"])) invalid();
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

$bytes=base64_decode($base64Data,true);
if ($bytes===false) invalid('Base64 inválido.');
if (strlen($bytes)>5242880) jsonResponse(['error'=>'Imagem excede 5 MiB.'],413);
$info=@getimagesizefromstring($bytes);
if (!$info || !in_array($info['mime'],['image/jpeg','image/png','image/webp'],true) || $info[0]*$info[1]>40000000) invalid('Imagem inválida ou não suportada.');
$mimeType=$info['mime'];
if (!GEMINI_API_KEY) jsonResponse(['error'=>'Serviço de IA não configurado.'],503);

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

        "code" => $httpCode
    ], 502);
}

$geminiData = json_decode($response, true);
$rawText = $geminiData["candidates"][0]["content"]["parts"][0]["text"] ?? null;
require_once __DIR__.'/danfe_delivery.php';
$companiesFile=getenv('ENTREGAS_COMPANIES_FILE') ?: __DIR__.'/companies_db.json';
$companies=is_file($companiesFile)?json_decode(file_get_contents($companiesFile),true,64,JSON_THROW_ON_ERROR):[];
if (!is_array($companies) || !array_is_list($companies)) throw new RuntimeException('catalog');
try {
    if (!is_string($rawText)) throw new InvalidArgumentException('response');
    $extracted=json_decode($rawText,true,64,JSON_THROW_ON_ERROR);
    $delivery=danfeDelivery($extracted,$companies,'geocodeAddress');
} catch (InvalidArgumentException|JsonException $e) {
    jsonResponse(['error'=>'Não foi possível extrair dados válidos da nota fiscal. Confira a imagem e tente novamente.'],422);
}
jsonResponse(['success'=>true,'delivery'=>$delivery]);
