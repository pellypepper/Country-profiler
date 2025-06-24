<?php
header('Content-Type: application/json');

// Load the GeoJSON file containing country borders
$borders = json_decode(file_get_contents('../data/countryBorders.geo.json'), true);
$countries = [];

foreach ($borders['features'] as $feature) {
    if (!empty($feature['properties']['name']) && !empty($feature['properties']['iso_a2'])) {
        $countries[] = [
            'name' => $feature['properties']['name'],
            'iso_a2' => $feature['properties']['iso_a2']
        ];
    }
}

// Sort countries by name
usort($countries, function($a, $b) {
    return strcmp($a['name'], $b['name']);
});

echo json_encode($countries);
?>