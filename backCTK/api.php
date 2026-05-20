<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["ok" => true]);
    exit;
}

session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['entity'], $_POST['action'])) {
    if ($_POST['entity'] === 'uploads' && $_POST['action'] === 'imagen') {
        try {
            if (!isset($_FILES['imagen'])) {
                responseError('No se ha enviado ninguna imagen');
            }

            $tipo = $_POST['tipo'] ?? '';

            $carpetasPermitidas = [
                'producto' => 'productos',
                'alergeno' => 'alergenos',
            ];

            if (!isset($carpetasPermitidas[$tipo])) {
                responseError('Tipo de imagen no válido');
            }

            $file = $_FILES['imagen'];

            if ($file['error'] !== UPLOAD_ERR_OK) {
                responseError('Error al subir la imagen');
            }

            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mimeType, $allowedMimeTypes, true)) {
                responseError('Formato de imagen no permitido');
            }

            $subcarpeta = $carpetasPermitidas[$tipo];
            $uploadDir = __DIR__ . '/uploads/' . $subcarpeta . '/';

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $originalName = $file['name'];
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
            $finalName = time() . '_' . $safeName . '.' . $extension;

            $destination = $uploadDir . $finalName;

            if (!move_uploaded_file($file['tmp_name'], $destination)) {
                responseError('No se pudo guardar la imagen en el servidor');
            }

            responseOk([
                'ok' => true,
                'message' => 'Imagen subida correctamente',
                'imagen' => 'uploads/' . $subcarpeta . '/' . $finalName,
                'nombreArchivo' => $finalName,
                'tipo' => $tipo
            ]);
        } catch (Throwable $e) {
            responseError('Error interno al subir la imagen', 500, $e->getMessage());
        }
    }
}

require_once __DIR__ . '/config/db.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];

$entity = $input['entity'] ?? '';
$action = $input['action'] ?? '';

function responseOk($data = [])
{
    echo json_encode($data);
    exit;
}

function responseError($message, $code = 400, $extra = null)
{
    http_response_code($code);
    $payload = ['error' => $message];
    if ($extra !== null) {
        $payload['debug'] = $extra;
    }
    echo json_encode($payload);
    exit;
}

try {
    if ($entity === 'auth' && $action === 'login') {
        $usuario = trim($input['usuario'] ?? '');
        $password = trim($input['password'] ?? '');

        if ($usuario === '' || $password === '') {
            responseError('Usuario y contraseña obligatorios');
        }

        $stmt = $pdo->prepare("
            SELECT 
                u.id,
                u.usuario,
                u.password_hash,
                u.activo,
                r.nombre AS rol
            FROM usuario u
            INNER JOIN rol r ON r.id = u.rol_id
            WHERE u.usuario = ?
            LIMIT 1
        ");
        $stmt->execute([$usuario]);
        $user = $stmt->fetch();

        if (!$user) {
            responseError('Usuario no encontrado', 401);
        }

        if ((int)$user['activo'] !== 1) {
            responseError('Usuario inactivo', 403);
        }

        if (!password_verify($password, $user['password_hash'])) {
            responseError('Credenciales incorrectas', 401);
        }

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['usuario'] = $user['usuario'];
        $_SESSION['rol'] = $user['rol'];

        responseOk([
            'user' => [
                'id' => $user['id'],
                'usuario' => $user['usuario'],
                'rol' => $user['rol']
            ]
        ]);
    }

    if ($entity === 'auth' && $action === 'logout') {
        session_unset();
        session_destroy();

        responseOk([
            'ok' => true,
            'message' => 'Sesión cerrada'
        ]);
    }

    if ($entity === 'usuarios' && $action === 'listar') {
        $stmt = $pdo->prepare("
            SELECT
                u.id,
                u.usuario,
                u.activo,
                u.created_at,
                r.id AS rol_id,
                r.nombre AS rol
            FROM usuario u
            INNER JOIN rol r ON r.id = u.rol_id
            ORDER BY u.id DESC
        ");
        $stmt->execute();

        responseOk([
            'usuarios' => $stmt->fetchAll()
        ]);
    }

    if ($entity === 'usuarios' && $action === 'roles') {
        $stmt = $pdo->prepare("
            SELECT id, nombre, descripcion
            FROM rol
            ORDER BY id ASC
        ");
        $stmt->execute();

        responseOk([
            'roles' => $stmt->fetchAll()
        ]);
    }

    if ($entity === 'usuarios' && $action === 'crear') {
        $usuario = trim($input['usuario'] ?? '');
        $password = trim($input['password'] ?? '');
        $rolId = $input['rol_id'] ?? null;
        $activo = isset($input['activo']) && $input['activo'] ? 1 : 0;

        if ($usuario === '' || $password === '' || !$rolId) {
            responseError('Faltan datos obligatorios');
        }

        $check = $pdo->prepare("SELECT id FROM usuario WHERE usuario = ?");
        $check->execute([$usuario]);

        if ($check->fetch()) {
            responseError('El usuario ya existe');
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            INSERT INTO usuario (usuario, password_hash, rol_id, activo)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$usuario, $passwordHash, $rolId, $activo]);

        responseOk([
            'ok' => true,
            'message' => 'Usuario creado correctamente'
        ]);
    }

    if ($entity === 'usuarios' && $action === 'actualizar') {
        $id = $input['id'] ?? null;
        $usuario = trim($input['usuario'] ?? '');
        $password = trim($input['password'] ?? '');
        $rolId = $input['rol_id'] ?? null;
        $activo = isset($input['activo']) && $input['activo'] ? 1 : 0;

        if (!$id || $usuario === '' || !$rolId) {
            responseError('Faltan datos obligatorios');
        }

        $check = $pdo->prepare("SELECT id FROM usuario WHERE usuario = ? AND id <> ?");
        $check->execute([$usuario, $id]);

        if ($check->fetch()) {
            responseError('Ya existe otro usuario con ese nombre');
        }

        if ($password !== '') {
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare("
                UPDATE usuario
                SET usuario = ?, password_hash = ?, rol_id = ?, activo = ?
                WHERE id = ?
            ");
            $stmt->execute([$usuario, $passwordHash, $rolId, $activo, $id]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE usuario
                SET usuario = ?, rol_id = ?, activo = ?
                WHERE id = ?
            ");
            $stmt->execute([$usuario, $rolId, $activo, $id]);
        }

        responseOk([
            'ok' => true,
            'message' => 'Usuario actualizado correctamente'
        ]);
    }

    if ($entity === 'usuarios' && $action === 'toggle') {
        $id = $input['id'] ?? null;
        $activo = isset($input['activo']) ? (int)$input['activo'] : null;

        if (!$id || ($activo !== 0 && $activo !== 1)) {
            responseError('Datos inválidos');
        }

        $stmt = $pdo->prepare("
            UPDATE usuario
            SET activo = ?
            WHERE id = ?
        ");
        $stmt->execute([$activo, $id]);

        responseOk([
            'ok' => true,
            'message' => 'Estado del usuario actualizado'
        ]);
    }

    if ($entity === 'usuarios' && $action === 'eliminar') {
        $id = $input['id'] ?? null;

        if (!$id) {
            responseError('ID obligatorio');
        }

        $stmt = $pdo->prepare("DELETE FROM usuario WHERE id = ?");
        $stmt->execute([$id]);

        responseOk([
            'ok' => true,
            'message' => 'Usuario eliminado correctamente'
        ]);
    }

    if ($entity === 'mesas' && $action === 'listar') {
        $stmt = $pdo->prepare("
        SELECT
            id,
            numero,
            capacidad,
            num_comensales AS numComensales,
            menu_id AS menuId,
            estado
        FROM mesa
        ORDER BY numero ASC
    ");
        $stmt->execute();

        responseOk([
            'mesas' => $stmt->fetchAll()
        ]);
    }

    if ($entity === 'mesas' && $action === 'crear') {
        $numero = $input['numero'] ?? null;
        $capacidad = $input['capacidad'] ?? null;
        $estado = trim($input['estado'] ?? '');
        $numComensales = $input['numComensales'] ?? 0;
        $menuId = array_key_exists('menuId', $input) ? $input['menuId'] : null;

        if (!$numero || !$capacidad || $estado === '') {
            responseError('Datos incompletos');
        }

        if ((int)$capacidad <= 0) {
            responseError('La capacidad debe ser mayor que 0');
        }

        if ((int)$numComensales < 0) {
            responseError('Los comensales no pueden ser negativos');
        }

        if ((int)$numComensales > (int)$capacidad) {
            responseError('Los comensales no pueden superar la capacidad');
        }

        $check = $pdo->prepare("SELECT id FROM mesa WHERE numero = ?");
        $check->execute([$numero]);

        if ($check->fetch()) {
            responseError('Ya existe una mesa con ese número');
        }

        $stmt = $pdo->prepare("
        INSERT INTO mesa (numero, capacidad, num_comensales, menu_id, estado)
        VALUES (?, ?, ?, ?, ?)
    ");
        $stmt->execute([$numero, $capacidad, $numComensales, $menuId, $estado]);

        responseOk([
            'ok' => true,
            'message' => 'Mesa creada correctamente'
        ]);
    }

    if ($entity === 'mesas' && $action === 'actualizar') {
        $id = $input['id'] ?? null;
        $numero = $input['numero'] ?? null;
        $capacidad = $input['capacidad'] ?? null;
        $estado = trim($input['estado'] ?? '');
        $numComensales = $input['numComensales'] ?? 0;
        $menuId = array_key_exists('menuId', $input) ? $input['menuId'] : null;

        if (!$id || !$numero || !$capacidad || $estado === '') {
            responseError('Datos incompletos');
        }

        if ((int)$capacidad <= 0) {
            responseError('La capacidad debe ser mayor que 0');
        }

        if ((int)$numComensales < 0) {
            responseError('Los comensales no pueden ser negativos');
        }

        if ((int)$numComensales > (int)$capacidad) {
            responseError('Los comensales no pueden superar la capacidad');
        }

        $check = $pdo->prepare("SELECT id FROM mesa WHERE numero = ? AND id <> ?");
        $check->execute([$numero, $id]);

        if ($check->fetch()) {
            responseError('Ya existe otra mesa con ese número');
        }

        $stmt = $pdo->prepare("
        UPDATE mesa
        SET numero = ?, capacidad = ?, num_comensales = ?, menu_id = ?, estado = ?
        WHERE id = ?
    ");
        $stmt->execute([$numero, $capacidad, $numComensales, $menuId, $estado, $id]);

        responseOk([
            'ok' => true,
            'message' => 'Mesa actualizada correctamente'
        ]);
    }

    if ($entity === 'mesas' && $action === 'validar-codigo') {
        $codigo = trim($input['codigo'] ?? '');

        if ($codigo === '') {
            responseError('Debes introducir un código');
        }

        if (!ctype_digit($codigo)) {
            responseError('El código debe ser numérico');
        }

        $stmt = $pdo->prepare("
        SELECT
            id,
            numero,
            capacidad,
            num_comensales AS numComensales,
            menu_id AS menuId,
            estado
        FROM mesa
        WHERE numero = ?
        LIMIT 1
    ");
        $stmt->execute([(int)$codigo]);
        $mesa = $stmt->fetch();

        if (!$mesa) {
            responseError('Mesa no encontrada', 404);
        }

        if ($mesa['estado'] === 'mantenimiento') {
            responseError('Mesa no disponible');
        }

        responseOk([
            'ok' => true,
            'mesa' => $mesa
        ]);
    }

    if ($entity === 'menus' && $action === 'listar') {
        $stmt = $pdo->prepare("
        SELECT
            id,
            nombre,
            coste,
            activo
        FROM menu
        WHERE activo = 1
        ORDER BY nombre ASC
    ");
        $stmt->execute();

        responseOk([
            'menus' => $stmt->fetchAll()
        ]);
    }
    if ($entity === 'menus' && $action === 'listar') {
        $stmt = $pdo->prepare("
        SELECT id, nombre, coste, activo
        FROM menu
        ORDER BY id DESC
    ");
        $stmt->execute();

        responseOk(['menus' => $stmt->fetchAll()]);
    }

    if ($entity === 'menus' && $action === 'crear') {
        $nombre = trim($input['nombre'] ?? '');
        $coste = $input['coste'] ?? null;
        $activo = isset($input['activo']) && $input['activo'] ? 1 : 0;

        if ($nombre === '' || $coste === null || $coste === '') {
            responseError('Faltan datos obligatorios');
        }

        $stmt = $pdo->prepare("
        INSERT INTO menu (nombre, coste, activo)
        VALUES (?, ?, ?)
    ");
        $stmt->execute([$nombre, $coste, $activo]);

        responseOk([
            'ok' => true,
            'message' => 'Menú creado correctamente'
        ]);
    }

    if ($entity === 'menus' && $action === 'actualizar') {
        $id = $input['id'] ?? null;
        $nombre = trim($input['nombre'] ?? '');
        $coste = $input['coste'] ?? null;
        $activo = isset($input['activo']) && $input['activo'] ? 1 : 0;

        if (!$id || $nombre === '' || $coste === null || $coste === '') {
            responseError('Faltan datos obligatorios');
        }

        $stmt = $pdo->prepare("
        UPDATE menu
        SET nombre = ?, coste = ?, activo = ?
        WHERE id = ?
    ");
        $stmt->execute([$nombre, $coste, $activo, $id]);

        responseOk([
            'ok' => true,
            'message' => 'Menú actualizado correctamente'
        ]);
    }

    if ($entity === 'categorias' && $action === 'listar') {
        $stmt = $pdo->prepare("
        SELECT id, nombre
        FROM categoria
        ORDER BY nombre ASC
    ");
        $stmt->execute();

        responseOk(['categorias' => $stmt->fetchAll()]);
    }

    if ($entity === 'categorias' && $action === 'crear') {
        $nombre = trim($input['nombre'] ?? '');

        if ($nombre === '') {
            responseError('El nombre es obligatorio');
        }

        $stmt = $pdo->prepare("INSERT INTO categoria (nombre) VALUES (?)");
        $stmt->execute([$nombre]);

        responseOk([
            'ok' => true,
            'message' => 'Categoría creada correctamente'
        ]);
    }

    if ($entity === 'categorias' && $action === 'actualizar') {
        $id = $input['id'] ?? null;
        $nombre = trim($input['nombre'] ?? '');

        if (!$id || $nombre === '') {
            responseError('Faltan datos obligatorios');
        }

        $stmt = $pdo->prepare("
        UPDATE categoria
        SET nombre = ?
        WHERE id = ?
    ");
        $stmt->execute([$nombre, $id]);

        responseOk([
            'ok' => true,
            'message' => 'Categoría actualizada correctamente'
        ]);
    }
    if ($entity === 'alergenos' && $action === 'listar') {
    $stmt = $pdo->prepare("
        SELECT id, nombre, icono
        FROM alergeno
        ORDER BY nombre ASC
    ");
    $stmt->execute();

    responseOk(['alergenos' => $stmt->fetchAll()]);
}

if ($entity === 'alergenos' && $action === 'crear') {
    $nombre = trim($input['nombre'] ?? '');
    $icono = trim($input['icono'] ?? '');

    if ($nombre === '') {
        responseError('El nombre es obligatorio');
    }

    $stmt = $pdo->prepare("
        INSERT INTO alergeno (nombre, icono)
        VALUES (?, ?)
    ");
    $stmt->execute([$nombre, $icono !== '' ? $icono : null]);

    responseOk([
        'ok' => true,
        'message' => 'Alérgeno creado correctamente'
    ]);
}

if ($entity === 'alergenos' && $action === 'actualizar') {
    $id = $input['id'] ?? null;
    $nombre = trim($input['nombre'] ?? '');
    $icono = trim($input['icono'] ?? '');

    if (!$id || $nombre === '') {
        responseError('Faltan datos obligatorios');
    }

    $stmt = $pdo->prepare("
        UPDATE alergeno
        SET nombre = ?, icono = ?
        WHERE id = ?
    ");
    $stmt->execute([$nombre, $icono !== '' ? $icono : null, $id]);

    responseOk([
        'ok' => true,
        'message' => 'Alérgeno actualizado correctamente'
    ]);
}

if ($entity === 'productos' && $action === 'listar') {
    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.nombre,
            p.imagen,
            p.categoria_id AS categoriaId,
            c.nombre AS categoriaNombre,
            p.disponible,
            p.precio
        FROM producto p
        INNER JOIN categoria c ON c.id = p.categoria_id
        ORDER BY p.id DESC
    ");
    $stmt->execute();
    $productos = $stmt->fetchAll();

    foreach ($productos as &$producto) {
        $stmtAlergenos = $pdo->prepare("
            SELECT a.id, a.nombre
            FROM producto_alergeno pa
            INNER JOIN alergeno a ON a.id = pa.alergeno_id
            WHERE pa.producto_id = ?
            ORDER BY a.nombre ASC
        ");
        $stmtAlergenos->execute([$producto['id']]);
        $producto['alergenos'] = $stmtAlergenos->fetchAll();
    }

    responseOk(['productos' => $productos]);
}

if ($entity === 'productos' && $action === 'crear') {
    $nombre = trim($input['nombre'] ?? '');
    $imagen = trim($input['imagen'] ?? '');
    $categoriaId = $input['categoriaId'] ?? null;
    $disponible = isset($input['disponible']) && $input['disponible'] ? 1 : 0;
    $precio = $input['precio'] ?? null;
    $alergenos = is_array($input['alergenos'] ?? null) ? $input['alergenos'] : [];

    if ($nombre === '' || !$categoriaId || $precio === null || $precio === '') {
        responseError('Faltan datos obligatorios');
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO producto (nombre, imagen, categoria_id, disponible, precio)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $nombre,
        $imagen !== '' ? $imagen : null,
        $categoriaId,
        $disponible,
        $precio
    ]);

    $productoId = $pdo->lastInsertId();

    if (!empty($alergenos)) {
        $stmtAlergeno = $pdo->prepare("
            INSERT INTO producto_alergeno (producto_id, alergeno_id)
            VALUES (?, ?)
        ");

        foreach ($alergenos as $alergenoId) {
            $stmtAlergeno->execute([$productoId, $alergenoId]);
        }
    }

    $pdo->commit();

    responseOk([
        'ok' => true,
        'message' => 'Producto creado correctamente'
    ]);
}

if ($entity === 'productos' && $action === 'actualizar') {
    $id = $input['id'] ?? null;
    $nombre = trim($input['nombre'] ?? '');
    $imagen = trim($input['imagen'] ?? '');
    $categoriaId = $input['categoriaId'] ?? null;
    $disponible = isset($input['disponible']) && $input['disponible'] ? 1 : 0;
    $precio = $input['precio'] ?? null;
    $alergenos = is_array($input['alergenos'] ?? null) ? $input['alergenos'] : [];

    if (!$id || $nombre === '' || !$categoriaId || $precio === null || $precio === '') {
        responseError('Faltan datos obligatorios');
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        UPDATE producto
        SET nombre = ?, imagen = ?, categoria_id = ?, disponible = ?, precio = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $nombre,
        $imagen !== '' ? $imagen : null,
        $categoriaId,
        $disponible,
        $precio,
        $id
    ]);

    $stmtDelete = $pdo->prepare("DELETE FROM producto_alergeno WHERE producto_id = ?");
    $stmtDelete->execute([$id]);

    if (!empty($alergenos)) {
        $stmtAlergeno = $pdo->prepare("
            INSERT INTO producto_alergeno (producto_id, alergeno_id)
            VALUES (?, ?)
        ");

        foreach ($alergenos as $alergenoId) {
            $stmtAlergeno->execute([$id, $alergenoId]);
        }
    }

    $pdo->commit();

    responseOk([
        'ok' => true,
        'message' => 'Producto actualizado correctamente'
    ]);
}
    responseError('Ruta no válida', 404);
} catch (Throwable $e) {
    responseError('Error interno del servidor', 500, $e->getMessage());
}
