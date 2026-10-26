<?php
declare(strict_types=1);

require_once __DIR__ . "/config.php";

$query = textField($_GET["q"] ?? "", 300);
if (empty($query)) {
    jsonResponse(["error" => "Parâmetro 'q' é obrigatório."], 400);
}

$municipio = textField($_GET["cidade"] ?? "Panambi",100);
$uf = textField($_GET["uf"] ?? "RS",2);

$geo = geocodeAddress($query, $municipio, $uf);

if ($geo) {
    jsonResponse([
        "success" => true,
        "lat" => $geo["lat"],
        "lon" => $geo["lon"],
        "display_name" => $geo["display_name"]
    ]);
} else {
    jsonResponse([
        "success" => false,
        "message" => "Endereço não localizado com precisão. Usando centro de Panambi.",
        "lat" => PANAMBI_DEFAULT_LAT,
        "lon" => PANAMBI_DEFAULT_LON
    ]);
}
