<?php
header('Content-Type: application/json');

// 📍 OpenCage reverse geocoding based on lat/lng
if (isset($_GET['lat']) && isset($_GET['lng'])) {
    $lat = $_GET['lat'];
    $lng = $_GET['lng'];
    $apiKey = '4d6d04de29d54a319c8f2eeb5b1b18a5'; 

    $url = "https://api.opencagedata.com/geocode/v1/json?q=$lat+$lng&key=$apiKey";
    $response = @file_get_contents($url);
    
    // Handle fetch failure
    if ($response === false) {
        echo json_encode(['error' => 'Failed to fetch location data']);
        exit;
    }
    
    // Return response
    echo $response;
    exit;
}

// 🌍 Country profile based on ISO2 or ISO3 code
if (isset($_GET['code'])) {
    $code = $_GET['code'];
    
    try {

        // 1. Country Info (REST Countries)
        $countryData = @file_get_contents("https://restcountries.com/v3.1/alpha/$code");
        if (!$countryData) {
            throw new Exception("Failed to fetch country data");
        }
        
        $country = json_decode($countryData, true);
        if (!is_array($country) || empty($country)) {
            throw new Exception("Invalid country data format");
        }
        
        $country = $country[0];
        $name = $country['name']['common'];
        $capital = isset($country['capital'][0]) ? $country['capital'][0] : 'N/A';
        $currencyCode = !empty($country['currencies']) ? array_key_first($country['currencies']) : 'N/A';
        
        // Extract language information
        $languages = 'N/A';
        if (!empty($country['languages'])) {
            $languages = implode(', ', $country['languages']);
        }
        
        // Extract flag and coat of arms
        $flag = isset($country['flags']['png']) ? $country['flags']['png'] : null;
        $coatOfArms = isset($country['coatOfArms']['png']) ? $country['coatOfArms']['png'] : null;


        // 2. Weather (OpenWeather)
        $weather = [];
        $weatherDesc = 'N/A';
        if ($capital !== 'N/A') {
            $openWeatherKey = '5014e6b3bf193188d57264af05782338'; // 
            $weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q=$capital&appid=$openWeatherKey&units=metric";
            $weatherData = @file_get_contents($weatherUrl);
            
            if ($weatherData !== false) {
                $weather = json_decode($weatherData, true);
                
                if (isset($weather['weather'][0]['description']) && isset($weather['main']['temp'])) {
                    $weatherDesc = $weather['weather'][0]['description'] . ', ' . $weather['main']['temp'] . '°C';
                }
            }
        }

       
        // 3. Exchange Rate (Open Exchange)
        $exchangeRate = 'N/A';
        if ($currencyCode !== 'N/A') {
            $exchangeData = @file_get_contents("https://open.er-api.com/v6/latest/USD");
            
            if ($exchangeData !== false) {
                $exchange = json_decode($exchangeData, true);
                $exchangeRate = isset($exchange['rates'][$currencyCode]) ? $exchange['rates'][$currencyCode] : 'N/A';
            }
        }

        // 4. Wikipedia (first paragraph extract)
        $wikiExtract = 'No summary found.';
        $wikiLink = "#";
        
        $wikiUrl = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&titles=" . urlencode($name) . "&origin=*";
        $wikiRaw = @file_get_contents($wikiUrl);
        
        if ($wikiRaw !== false) {
            $wikiJson = json_decode($wikiRaw, true);
            if (isset($wikiJson['query']) && isset($wikiJson['query']['pages'])) {
                $wikiPage = array_values($wikiJson['query']['pages'])[0];
                $wikiExtract = isset($wikiPage['extract']) ? $wikiPage['extract'] : 'No summary found.';
                $wikiLink = isset($wikiPage['pageid']) ? "https://en.wikipedia.org/?curid=" . $wikiPage['pageid'] : "#";
            }
        }


        // 5. GeoNames (basic country data)
        $geo = [];
        $geoUser = 'ppeliance';
        $geoUrl = "http://api.geonames.org/countryInfoJSON?country=$code&username=$geoUser";
        $geoData = @file_get_contents($geoUrl);
        
        if ($geoData !== false) {
            $geoParsed = json_decode($geoData, true);
            $geo = isset($geoParsed['geonames'][0]) ? $geoParsed['geonames'][0] : [];
        }

   
        // 6. Earthquake ( last 7 days)
        $quakes = [];
        $quakeData = @file_get_contents("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson");
        
        if ($quakeData !== false) {
            $quakeJson = json_decode($quakeData, true);
            if (isset($quakeJson['features'])) {
                foreach ($quakeJson['features'] as $quake) {
                    if (isset($quake['properties']['place']) && 
                        isset($quake['properties']['mag']) && 
                        isset($quake['properties']['time'])) {
                        
                        $place = $quake['properties']['place'];
                        $magnitude = $quake['properties']['mag'];
                        $time = date('Y-m-d H:i', $quake['properties']['time'] / 1000);
                        $quakes[] = "$place (M $magnitude at $time)";
                    }
                }
            }
        }


        // Response 
        $response = [
            'name' => $name,
            'capital' => $capital,
            'population' => isset($country['population']) ? $country['population'] : 'N/A',
            'currency' => $currencyCode,
            'currencyCode' => $currencyCode, 
            'exchangeRate' => $exchangeRate,
            'languages' => $languages,
            'flag' => $flag,
            'coatOfArms' => $coatOfArms,
            'weather' => $weatherDesc,
            'wikipedia' => [
                'summary' => $wikiExtract,
                'link' => $wikiLink
            ],
            'geoNames' => $geo,
            'earthquakes' => array_slice($quakes, 0, 5)
        ];
        
        echo json_encode($response);
        
    } catch (Exception $e) {
        // Return error as JSON
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => 'No parameters provided']);
}
?>