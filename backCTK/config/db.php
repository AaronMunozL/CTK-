<?php
/**
 * Conexión PDO a MySQL.
 * ERRMODE_EXCEPTION lanza PDOException en caso de fallo SQL, lo que permite
 * capturarlos en los try/catch de api.php y hacer rollback si hay transacción.
 * FETCH_ASSOC evita índices numéricos duplicados en los resultados.
 */

$host = '127.0.0.1';
$dbname = 'restaurante_ctk';
$username = 'root';
$password = '';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Error de conexión a base de datos']);
    exit;
}