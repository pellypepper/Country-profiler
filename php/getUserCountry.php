<?php
header('Content-Type: application/json');
function get($url) {
    $opts = [
        "http" => [
            "method" => "GET",
            "header" => "User-Agent: country-profiler/1.0\r\n"
        ]
    ];
    $context = stream_context_create($opts);
    return @file_get_contents($url, false, $context);
}

if (isset($_GET['lat']) && isset($_GET['lng'])) {
    $lat = $_GET['lat'];
    $lng = $_GET['lng'];
    // Use your OpenCage API key!
    $apiKey = '';
    $url = "https://api.opencagedata.com/geocode/v1/json?q=$lat+$lng&key=$apiKey";
    $response = get($url);
    if ($response === false) {
        echo json_encode(['error' => 'Failed to fetch location data']);
        exit;
    }
    $data = json_decode($response, true);
    if (isset($data['results'][0]['components']['country_code'])) {
        echo json_encode([
            'countryCode' => strtoupper($data['results'][0]['components']['country_code'])
        ]);
    } else {
        echo json_encode(['error' => 'Country code not found']);
    }
    exit;
}
echo json_encode(['error' => 'No lat/lng']);
?>