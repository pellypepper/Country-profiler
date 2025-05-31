<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');


$apiKey = 'apiKey';


$response = array(
    'tileUrl' => "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=" . $apiKey,
    'attribution' => 'Weather data © OpenWeatherMap',
    'maxZoom' => 18,
    'opacity' => 0.5
);

echo json_encode($response);
?>