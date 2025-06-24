<?php
header('Content-Type: application/json');

if (isset($_GET['code'])) {
    $code = $_GET['code'];
    $geoJsonFile = "../data/countryBorders.geo.json";
    
    if (!file_exists($geoJsonFile)) {
        echo json_encode(['error' => 'GeoJSON file not found']);
        exit;
    }
    $geoJsonContent = file_get_contents($geoJsonFile);
    if (!$geoJsonContent) {
        echo json_encode(['error' => 'Failed to read GeoJSON file']);
        exit;
    }
    $geoJson = json_decode($geoJsonContent, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['error' => 'Invalid GeoJSON format: ' . json_last_error_msg()]);
        exit;
    }
    foreach ($geoJson['features'] as $feature) {
        if ($feature['properties']['iso_a2'] === $code) {
            // Return just the feature for the selected country
            echo json_encode($feature);
            exit;
        }
    }
    // Not found
    echo json_encode([
        'type' => 'Feature',
        'properties' => ['error' => 'Country not found'],
        'geometry' => null
    ]);
} else {
    echo json_encode(['error' => 'No country code provided']);
}
?>