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
        "display_name" => $geo["display_name"],
        "source" => "nominatim",
        "needs_review" => true
    ]);
} else {
    jsonResponse([
        "success" => false,
        "message" => "Endereço não localizado. Confira o endereço ou informe coordenadas verificadas; nenhuma posição foi atribuída.",
        "lat" => null,
        "lon" => null,
        "needs_review" => true
    ]);
}
