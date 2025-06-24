<?php
header('Content-Type: application/json');

$amount = isset($_GET['amount']) ? floatval($_GET['amount']) : 0;
$from = isset($_GET['from']) ? strtoupper(trim($_GET['from'])) : '';
$to = isset($_GET['to']) ? strtoupper(trim($_GET['to'])) : '';

if ($amount <= 0 || !$from || !$to) {
    echo json_encode(['error' => 'Invalid parameters']);
    exit;
}

$access_key = ''; 
$url = "https://api.exchangerate.host/convert?from=$from&to=$to&amount=$amount&access_key=$access_key";
$response = @file_get_contents($url);
if ($response === false) {
    echo json_encode(['error' => 'Failed to fetch exchange rate']);
    exit;
}
$data = json_decode($response, true);

if (isset($data['result'])) {
    echo json_encode(['converted' => $data['result']]);
} else {
    $errorMsg = isset($data['error']['info']) ? $data['error']['info'] : 'Conversion failed';
    echo json_encode(['error' => $errorMsg]);
}
?>