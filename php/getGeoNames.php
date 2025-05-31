<?php
header('Content-Type: application/json');

// Validate input
if (!isset($_GET['q']) || !isset($_GET['country'])) {
    echo json_encode(['error' => 'Missing q or country parameter']);
    exit;
}

$q = urlencode($_GET['q']);
$country = urlencode($_GET['country']);

$url = "http://api.geonames.org/searchJSON?formatted=true&q=$q&country=$country&maxRows=80&lang=en&username=flightltd&style=full";


$response = @file_get_contents($url);

if ($response === false) {
    echo json_encode(['error' => 'Failed to fetch data from GeoNames']);
    exit;
}

echo $response;
?>