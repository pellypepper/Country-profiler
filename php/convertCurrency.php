<?php
header('Content-Type: application/json');
if (!isset($_GET['from']) || !isset($_GET['to']) || !isset($_GET['amount'])) {
    echo json_encode(['error' => 'missing parameters']); exit;
}
$from = strtoupper($_GET['from']);
$to = strtoupper($_GET['to']);
$amount = floatval($_GET['amount']);
$url = "https://api.frankfurter.app/latest?amount=$amount&from=$from&to=$to";
$response = @file_get_contents($url);
if ($response === false) {
    echo json_encode(['error' => 'Conversion failed']); exit;
}
$data = json_decode($response, true);
if (isset($data['rates'][$to])) {
    echo json_encode(['converted' => round($data['rates'][$to], 2)]);
} else {
    echo json_encode(['error' => 'Conversion failed']);
}
?>