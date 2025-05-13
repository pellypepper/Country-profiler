<?php
header('Content-Type: application/json');

if (isset($_GET['code'])) {
    $code = $_GET['code'];
    
    // Load the GeoJSON file
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
    
    // Find the country by ISO code
    $found = false;
    foreach ($geoJson['features'] as $feature) {
        if ($feature['properties']['iso_a2'] === $code) {
            // check valid GeoJSON feature
            if (isset($feature['type']) && isset($feature['geometry']) && isset($feature['properties'])) {
                echo json_encode($feature);
                $found = true;
                break;
            }
        }
    }
    
    if (!$found) {
        echo json_encode([
            'type' => 'Feature',
            'properties' => ['error' => 'Country not found'],
            'geometry' => null
        ]);
    }
} else {
    echo json_encode(['error' => 'No country code provided']);
}
?>