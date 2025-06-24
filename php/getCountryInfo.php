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

// 📍 OpenCage reverse geocoding based on lat/lng
if (isset($_GET['lat']) && isset($_GET['lng'])) {
    $lat = $_GET['lat'];
    $lng = $_GET['lng'];
    $apiKey = '';
    $url = "https://api.opencagedata.com/geocode/v1/json?q=$lat+$lng&key=$apiKey";
    $response = get($url);
    if ($response === false) {
        echo json_encode(['error' => 'Failed to fetch location data']);
        exit;
    }
    echo $response;
    exit;
}


// 🌍 Country profile based on ISO2 or ISO3 code
if (isset($_GET['code'])) {
    $code = $_GET['code'];
    try {
        // 1. Country Info (REST Countries)
        $countryData = get("https://restcountries.com/v3.1/alpha/$code");
        if (!$countryData) throw new Exception("Failed to fetch country data");
        $countryArr = json_decode($countryData, true);
        if (!is_array($countryArr) || empty($countryArr)) throw new Exception("Invalid country data format");
        $country = $countryArr[0];

        $name = $country['name']['common'];
        $capital = isset($country['capital'][0]) ? $country['capital'][0] : 'N/A';
        $currencyCode = !empty($country['currencies']) ? array_key_first($country['currencies']) : 'N/A';
        $flag = isset($country['flags']['png']) ? $country['flags']['png'] : null;
        $coatOfArms = isset($country['coatOfArms']['png']) ? $country['coatOfArms']['png'] : null;
        $population = isset($country['population']) ? $country['population'] : 'N/A';

        $languages = 'N/A';
        if (!empty($country['languages']) && is_array($country['languages'])) {
            $languages = implode(', ', array_values($country['languages']));
        }

        // 2. Weather (OpenWeather 3-Day Forecast - noon only, with icons)
        $weather = [];
        $weatherKey = '';
        if ($capital !== 'N/A') {
            $weatherUrl = "https://api.openweathermap.org/data/2.5/forecast?q=" . urlencode($capital) . "&appid=$weatherKey&units=metric";
            $weatherData = get($weatherUrl);
            if ($weatherData !== false) {
                $w = json_decode($weatherData, true);
                if (isset($w['list'])) {
                    foreach ($w['list'] as $item) {
                        if (strpos($item['dt_txt'], "12:00:00") !== false) {
                            $weather[] = [
                                'date' => $item['dt_txt'],
                                'desc' => $item['weather'][0]['description'],
                                'temp' => $item['main']['temp'],
                                'icon' => $item['weather'][0]['icon']
                            ];
                        }
                        if (count($weather) >= 3) break;
                    }
                }
            }
        }

        // 3. Exchange Rate (Open Exchange)
  $exchangeRate = 'N/A';
if ($currencyCode !== 'N/A') {
    $apiKey = "";
    $exchangeData = get("https://v6.exchangerate-api.com/v6/$apiKey/latest/USD");
    if ($exchangeData !== false) {
        $exchange = json_decode($exchangeData, true);
        $exchangeRate = isset($exchange['conversion_rates'][$currencyCode]) ? $exchange['conversion_rates'][$currencyCode] : 'N/A';
    }
}

        // 4. Wikipedia (search and summary)
        $wiki = ['results' => [], 'summary' => '', 'link' => '#'];
        $wikiSearchUrl = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" . urlencode($name) . "&format=json&origin=*";
        $wikiData = get($wikiSearchUrl);
        if ($wikiData) {
            $wikiJson = json_decode($wikiData, true);
            if (isset($wikiJson['query']['search'])) {
                foreach (array_slice($wikiJson['query']['search'], 0, 3) as $a) {
                    $wiki['results'][] = [
                        'title' => $a['title'],
                        'snippet' => $a['snippet']
                    ];
                }
            }
        }
        $wikiSummaryUrl = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&titles=" . urlencode($name) . "&origin=*";
        $wikiRaw = get($wikiSummaryUrl);
        if ($wikiRaw) {
            $wikiJson = json_decode($wikiRaw, true);
            if (isset($wikiJson['query']['pages'])) {
                $page = array_values($wikiJson['query']['pages'])[0];
                $wiki['summary'] = isset($page['extract']) ? $page['extract'] : '';
                $wiki['link'] = isset($page['pageid']) ? "https://en.wikipedia.org/?curid=" . $page['pageid'] : '#';
            }
        }

        // 5. GeoNames (basic country data)
        $geo = [];
        $geoUser = '';
        $geoUrl = "http://api.geonames.org/countryInfoJSON?country=$code&username=$geoUser";
        $geoData = get($geoUrl);
        if ($geoData !== false) {
            $geoParsed = json_decode($geoData, true);
            $geo = isset($geoParsed['geonames'][0]) ? $geoParsed['geonames'][0] : [];
        }

        // 6. Earthquakes (significant, global)
        $quakes = [];
        $quakeData = get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson");
        if ($quakeData !== false) {
            $quakeJson = json_decode($quakeData, true);
            if (isset($quakeJson['features'])) {
                foreach ($quakeJson['features'] as $quake) {
                    if (isset($quake['properties']['place']) &&
                        isset($quake['properties']['mag']) &&
                        isset($quake['properties']['time'])) {
                        // Optional: Only include earthquakes that mention the country name in 'place'
                        if (stripos($quake['properties']['place'], $name) !== false) {
                            $place = $quake['properties']['place'];
                            $magnitude = $quake['properties']['mag'];
                            $time = date('Y-m-d H:i', $quake['properties']['time'] / 1000);
                            $quakes[] = "$place (M $magnitude at $time)";
                        }
                    }
                }
            }
        }

        // 7. News (gnews.io) - include article images
        $newsList = [];
        $apiKey = '';
        $from = date('Y-m-d', strtotime('-2 days'));
        $newsUrl = "https://gnews.io/api/v4/search?token=$apiKey&q=" . urlencode($name) . "&lang=en&max=5&from=$from";
        $newsData = get($newsUrl);
        if ($newsData) {
            $newsJson = json_decode($newsData, true);
            if (isset($newsJson['articles'])) {
                foreach ($newsJson['articles'] as $a) {
                    $newsList[] = [
                        'title' => $a['title'],
                        'url' => $a['url'],
                        'source' => $a['source']['name'],
                        'publishedAt' => $a['publishedAt'],
                        'image' => isset($a['image']) ? $a['image'] : null
                    ];
                }
            }
        }

        echo json_encode([
            'name' => $name,
            'capital' => $capital,
            'population' => $population,
            'currency' => $currencyCode,
            'exchangeRate' => $exchangeRate,
            'languages' => $languages,
            'flag' => $flag,
            'coatOfArms' => $coatOfArms,
            'weatherForecast' => $weather,
            'wikipedia' => $wiki,
            'geoNames' => $geo,
            'earthquakes' => array_slice($quakes, 0, 5),
            'news' => $newsList
        ]);
    } catch (Exception $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['error' => 'No parameters provided']);
?>