<?php
/**
 * API principal de CTK — punto de entrada único para todas las peticiones JSON.
 *
 * Todas las llamadas llegan como POST con un body JSON { entity, action, ...datos }.
 * Los uploads de imagen son la única excepción: llegan como multipart/form-data.
 *
 * Entidades disponibles: auth, uploads, usuarios, mesas, menus, categorias,
 *                        alergenos, productos, cocina, pedidos.
 */

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

header("Content-Type: application/json; charset=utf-8");

// Respuesta vacía a peticiones preflight de CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

// ─── SUBIDA DE IMÁGENES ───────────────────────────────────────────────────────
// Se maneja antes de cargar la BD porque llega como multipart, no JSON.
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
                mkdir($uploadDir, 0755, true);
            }

            $originalName = $file['name'];
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            // Se sanea el nombre original para evitar caracteres problemáticos en la ruta
            $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
            // Se prefija con el timestamp para garantizar nombres únicos
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

// Lectura del body JSON; si no hay body o no es JSON válido se usa array vacío
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$entity = $input['entity'] ?? '';
$action = $input['action'] ?? '';

// ─── HELPERS DE RESPUESTA ────────────────────────────────────────────────────

/** Devuelve JSON de éxito y detiene la ejecución. */
function responseOk($data = [])
{
    echo json_encode($data);
    exit;
}

/** Devuelve JSON de error con el código HTTP indicado y detiene la ejecución. */
function responseError($message, $code = 400, $extra = null)
{
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

/**
 * Genera un código de 6 dígitos que no esté en uso en ninguna mesa activa.
 * El bucle do-while garantiza unicidad aunque la probabilidad de colisión es mínima.
 */
function generarCodigoMesaUnico(PDO $pdo)
{
    do {
        $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare("
            SELECT id
            FROM mesa
            WHERE codigo_acceso = ? AND codigo_activo = 1
            LIMIT 1
        ");
        $stmt->execute([$codigo]);
        $existe = $stmt->fetch();
    } while ($existe);

    return $codigo;
}

// ─── ENRUTADOR PRINCIPAL ─────────────────────────────────────────────────────
// Cada bloque if comprueba entity+action y responde (responseOk/responseError),
// lo que llama a exit(), por lo que los bloques son mutuamente excluyentes.
try {
    // ── AUTH ──────────────────────────────────────────────────────────────────

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

    // ── MESAS ─────────────────────────────────────────────────────────────────

    /**
     * cerrar: cierra una mesa por parte del personal (recepción/camarero).
     * Marca el histórico con fecha_cierre, borra los pedidos activos
     * y libera la mesa (estado libre, código inactivo).
     * Operación en transacción para garantizar consistencia.
     */
    if ($entity === 'mesas' && $action === 'cerrar') {
        $id = $input['id'] ?? null;

        if (!$id) {
            responseError('ID de mesa obligatorio');
        }

        $stmtMesa = $pdo->prepare("
        SELECT id, estado
        FROM mesa
        WHERE id = ?
        LIMIT 1
    ");
        $stmtMesa->execute([$id]);
        $mesa = $stmtMesa->fetch(PDO::FETCH_ASSOC);

        if (!$mesa) {
            responseError('Mesa no encontrada', 404);
        }

        $pdo->beginTransaction();

        try {
            $stmtHistorico = $pdo->prepare("
            UPDATE historico_mesa
            SET fecha_cierre = NOW()
            WHERE mesa_id = ?
              AND fecha_cierre IS NULL
        ");
            $stmtHistorico->execute([$id]);

            $stmtDeletePedidos = $pdo->prepare("
            DELETE FROM pedido
            WHERE mesa_id = ?
        ");
            $stmtDeletePedidos->execute([$id]);

            $stmtMesaCerrar = $pdo->prepare("
            UPDATE mesa
            SET
                estado = 'libre',
                num_comensales = 0,
                menu_id = NULL,
                codigo_acceso = NULL,
                codigo_activo = 0,
                codigo_generado_at = NULL
            WHERE id = ?
        ");
            $stmtMesaCerrar->execute([$id]);

            $pdo->commit();

            responseOk([
                'ok' => true,
                'message' => 'Mesa cerrada correctamente y pedidos eliminados'
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            responseError('Error al cerrar la mesa', 500, $e->getMessage());
        }
    }
    // ── USUARIOS ──────────────────────────────────────────────────────────────

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

    // Si no se envía contraseña nueva se actualiza solo el resto de campos
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

    // ── MESAS (CRUD) ──────────────────────────────────────────────────────────

    if ($entity === 'mesas' && $action === 'listar') {
        $stmt = $pdo->prepare("
        SELECT
            id,
            numero,
            capacidad,
            num_comensales AS numComensales,
            menu_id AS menuId,
            estado,
            codigo_acceso AS codigoAcceso,
            codigo_activo AS codigoActivo,
            codigo_generado_at AS codigoGeneradoAt
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
        INSERT INTO mesa (
            numero,
            capacidad,
            num_comensales,
            menu_id,
            estado,
            codigo_acceso,
            codigo_activo,
            codigo_generado_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, 0, NULL)
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


    // ── ACCESO DE CLIENTE POR CÓDIGO ─────────────────────────────────────────

    /**
     * validar-codigo: el cliente introduce el código de 6 dígitos de su mesa
     * para acceder a la vista de usuario. Devuelve los datos de la mesa.
     */
    if ($entity === 'mesas' && $action === 'validar-codigo') {
        $codigo = trim($input['codigo'] ?? '');

        if ($codigo === '') {
            responseError('Debes introducir un código');
        }

        if (!preg_match('/^\d{6}$/', $codigo)) {
            responseError('El código debe tener 6 dígitos');
        }

        $stmt = $pdo->prepare("
        SELECT
            id,
            numero,
            capacidad,
            num_comensales AS numComensales,
            menu_id AS menuId,
            estado,
            codigo_acceso AS codigoAcceso,
            codigo_activo AS codigoActivo,
            codigo_generado_at AS codigoGeneradoAt
        FROM mesa
        WHERE codigo_acceso = ? AND codigo_activo = 1
        LIMIT 1
    ");
        $stmt->execute([$codigo]);
        $mesa = $stmt->fetch();

        if (!$mesa) {
            responseError('Código de mesa no válido', 404);
        }

        if ($mesa['estado'] === 'mantenimiento') {
            responseError('Mesa no disponible');
        }

        responseOk([
            'ok' => true,
            'mesa' => $mesa
        ]);
    }

    if ($entity === 'mesas' && $action === 'generar-codigo') {
        $id = $input['id'] ?? null;

        if (!$id) {
            responseError('ID de mesa obligatorio');
        }

        $stmtMesa = $pdo->prepare("
        SELECT id, numero, estado
        FROM mesa
        WHERE id = ?
        LIMIT 1
    ");
        $stmtMesa->execute([$id]);
        $mesa = $stmtMesa->fetch();

        if (!$mesa) {
            responseError('Mesa no encontrada', 404);
        }

        if ($mesa['estado'] === 'mantenimiento') {
            responseError('No se puede generar código para una mesa en mantenimiento');
        }

        $codigo = generarCodigoMesaUnico($pdo);

        $stmt = $pdo->prepare("
        UPDATE mesa
        SET codigo_acceso = ?, codigo_activo = 1, codigo_generado_at = NOW()
        WHERE id = ?
    ");
        $stmt->execute([$codigo, $id]);

        responseOk([
            'ok' => true,
            'message' => 'Código generado correctamente',
            'mesa' => [
                'id' => (int) $mesa['id'],
                'numero' => $mesa['numero'],
                'codigoAcceso' => $codigo,
                'codigoActivo' => 1
            ]
        ]);
    }

    if ($entity === 'mesas' && $action === 'resetear-codigo') {
        $id = $input['id'] ?? null;

        if (!$id) {
            responseError('ID de mesa obligatorio');
        }

        $stmtMesa = $pdo->prepare("
        SELECT id
        FROM mesa
        WHERE id = ?
        LIMIT 1
    ");
        $stmtMesa->execute([$id]);
        $mesa = $stmtMesa->fetch();

        if (!$mesa) {
            responseError('Mesa no encontrada', 404);
        }

        $stmt = $pdo->prepare("
        UPDATE mesa
        SET codigo_acceso = NULL, codigo_activo = 0, codigo_generado_at = NULL
        WHERE id = ?
    ");
        $stmt->execute([$id]);

        responseOk([
            'ok' => true,
            'message' => 'Código reseteado correctamente'
        ]);
    }

    // ── MENÚS ─────────────────────────────────────────────────────────────────
    // NOTA: hay dos handlers para 'menus/listar'. El segundo (más abajo) nunca
    // se ejecuta porque responseOk() llama a exit(). Solo aplica este primero,
    // que filtra por activo=1 y ordena por nombre.

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

    // ── CATEGORÍAS ────────────────────────────────────────────────────────────

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
    // ── ALÉRGENOS ─────────────────────────────────────────────────────────────

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

    // ── PRODUCTOS ─────────────────────────────────────────────────────────────

    /**
     * listar: devuelve todos los productos con sus alérgenos y menús asociados.
     * Se hacen N consultas adicionales (una por producto) para cargar relaciones.
     * Aceptable para el volumen de un restaurante; para catálogos grandes
     * sería mejor un JOIN o una subconsulta agregada.
     */
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
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtAlergenos = $pdo->prepare("
        SELECT a.id, a.nombre
        FROM producto_alergeno pa
        INNER JOIN alergeno a ON a.id = pa.alergeno_id
        WHERE pa.producto_id = ?
        ORDER BY a.nombre ASC
    ");

        $stmtMenus = $pdo->prepare("
        SELECT m.id, m.nombre
        FROM producto_menu pm
        INNER JOIN menu m ON m.id = pm.menu_id
        WHERE pm.producto_id = ?
        ORDER BY m.nombre ASC
    ");

        foreach ($productos as &$producto) {
            $stmtAlergenos->execute([$producto['id']]);
            $producto['alergenos'] = $stmtAlergenos->fetchAll(PDO::FETCH_ASSOC);

            $stmtMenus->execute([$producto['id']]);
            $menus = $stmtMenus->fetchAll(PDO::FETCH_ASSOC);

            $producto['menus'] = $menus;
            $producto['menuIds'] = array_map(fn($m) => (int)$m['id'], $menus);
            $producto['menuNombres'] = array_map(fn($m) => $m['nombre'], $menus);
        }

        responseOk([
            'ok' => true,
            'productos' => $productos
        ]);
    }

    if ($entity === 'productos' && $action === 'crear') {
        $nombre = trim($input['nombre'] ?? '');
        $imagen = trim($input['imagen'] ?? '');
        $categoriaId = $input['categoriaId'] ?? null;
        $disponible = isset($input['disponible']) && $input['disponible'] ? 1 : 0;
        $precio = $input['precio'] ?? null;
        $alergenos = is_array($input['alergenos'] ?? null) ? $input['alergenos'] : [];
        $menus = is_array($input['menus'] ?? null) ? $input['menus'] : [];

        if ($nombre === '' || !$categoriaId || $precio === null || $precio === '') {
            responseError('Faltan datos obligatorios');
        }

        $pdo->beginTransaction();

        try {
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

            $productoId = (int)$pdo->lastInsertId();

            if (!empty($alergenos)) {
                $stmtAlergeno = $pdo->prepare("
                INSERT INTO producto_alergeno (producto_id, alergeno_id)
                VALUES (?, ?)
            ");

                foreach ($alergenos as $alergenoId) {
                    $stmtAlergeno->execute([$productoId, (int)$alergenoId]);
                }
            }

            if (!empty($menus)) {
                $stmtMenu = $pdo->prepare("
                INSERT INTO producto_menu (producto_id, menu_id)
                VALUES (?, ?)
            ");

                foreach ($menus as $menuId) {
                    $stmtMenu->execute([$productoId, (int)$menuId]);
                }
            }

            $pdo->commit();

            responseOk([
                'ok' => true,
                'message' => 'Producto creado correctamente'
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            responseError('Error al crear el producto', 500, $e->getMessage());
        }
    }

    /**
     * actualizar: estrategia delete-insert para alérgenos y menús.
     * Se borran todas las relaciones existentes y se reinsertan con los nuevos
     * valores, evitando lógica de diff. Seguro gracias a la transacción.
     */
    if ($entity === 'productos' && $action === 'actualizar') {
        $id = $input['id'] ?? null;
        $nombre = trim($input['nombre'] ?? '');
        $imagen = trim($input['imagen'] ?? '');
        $categoriaId = $input['categoriaId'] ?? null;
        $disponible = isset($input['disponible']) && $input['disponible'] ? 1 : 0;
        $precio = $input['precio'] ?? null;
        $alergenos = is_array($input['alergenos'] ?? null) ? $input['alergenos'] : [];
        $menus = is_array($input['menus'] ?? null) ? $input['menus'] : [];

        if (!$id || $nombre === '' || !$categoriaId || $precio === null || $precio === '') {
            responseError('Faltan datos obligatorios');
        }

        $pdo->beginTransaction();

        try {
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

            $stmtDeleteAlergenos = $pdo->prepare("
            DELETE FROM producto_alergeno
            WHERE producto_id = ?
        ");
            $stmtDeleteAlergenos->execute([$id]);

            if (!empty($alergenos)) {
                $stmtAlergeno = $pdo->prepare("
                INSERT INTO producto_alergeno (producto_id, alergeno_id)
                VALUES (?, ?)
            ");

                foreach ($alergenos as $alergenoId) {
                    $stmtAlergeno->execute([(int)$id, (int)$alergenoId]);
                }
            }

            $stmtDeleteMenus = $pdo->prepare("
            DELETE FROM producto_menu
            WHERE producto_id = ?
        ");
            $stmtDeleteMenus->execute([$id]);

            if (!empty($menus)) {
                $stmtMenu = $pdo->prepare("
                INSERT INTO producto_menu (producto_id, menu_id)
                VALUES (?, ?)
            ");

                foreach ($menus as $menuId) {
                    $stmtMenu->execute([(int)$id, (int)$menuId]);
                }
            }

            $pdo->commit();

            responseOk([
                'ok' => true,
                'message' => 'Producto actualizado correctamente'
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            responseError('Error al actualizar el producto', 500, $e->getMessage());
        }
    }

    // ── COCINA ────────────────────────────────────────────────────────────────

    /**
     * listar_pedidos: devuelve pedidos ordenados por urgencia (pendiente > en
     * preparacion > listo) y luego por fecha de creación. Incluye las líneas
     * de cada pedido en la misma respuesta para evitar N+1 en el frontend.
     */
    if ($entity === 'cocina' && $action === 'listar_pedidos') {
        $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.mesa_id,
            m.numero AS mesa_numero,
            p.estado,
            p.created_at,
            p.updated_at
        FROM pedido p
        INNER JOIN mesa m ON m.id = p.mesa_id
        ORDER BY
            CASE p.estado
                WHEN 'pendiente' THEN 1
                WHEN 'en preparacion' THEN 2
                WHEN 'listo' THEN 3
                ELSE 4
            END,
            p.created_at ASC
    ");
        $stmt->execute();
        $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtLineas = $pdo->prepare("
        SELECT
            lp.id,
            lp.pedido_id,
            lp.producto_id,
            pr.nombre AS producto_nombre,
            lp.cantidad,
            lp.precio_unitario,
            lp.estado,
            lp.observaciones
        FROM linea_pedido lp
        INNER JOIN producto pr ON pr.id = lp.producto_id
        WHERE lp.pedido_id = ?
        ORDER BY lp.id ASC
    ");

        foreach ($pedidos as &$pedido) {
            $stmtLineas->execute([$pedido['id']]);
            $lineas = $stmtLineas->fetchAll(PDO::FETCH_ASSOC);

            $pedido['mesaNumero'] = $pedido['mesa_numero'];
            $pedido['createdAt'] = $pedido['created_at'];
            $pedido['updatedAt'] = $pedido['updated_at'];
            $pedido['lineas'] = array_map(function ($linea) {
                return [
                    'id' => (int)$linea['id'],
                    'pedidoId' => (int)$linea['pedido_id'],
                    'productoId' => (int)$linea['producto_id'],
                    'productoNombre' => $linea['producto_nombre'],
                    'cantidad' => (int)$linea['cantidad'],
                    'precioUnitario' => (float)$linea['precio_unitario'],
                    'estado' => $linea['estado'],
                    'observaciones' => $linea['observaciones'],
                ];
            }, $lineas);

            unset(
                $pedido['mesa_id'],
                $pedido['mesa_numero'],
                $pedido['created_at'],
                $pedido['updated_at']
            );
        }

        responseOk([
            'ok' => true,
            'pedidos' => $pedidos
        ]);
    }

    // ── PEDIDOS ───────────────────────────────────────────────────────────────

    /**
     * crear: crea un pedido con sus líneas en una transacción.
     * Pasos: insertar pedido → insertar líneas → actualizar estado mesa a
     * 'ocupada' → insertar registro en histórico_mesa.
     * Si la mesa tiene menú asignado, también calcula el coste del menú
     * (coste × num_comensales) y lo incluye en la respuesta para informar
     * al usuario, aunque el total_facturado en historico_mesa solo refleja
     * el importe de los productos.
     */
    if ($entity === 'pedidos' && $action === 'crear') {
        $mesaId = $input['mesaId'] ?? null;
        $productos = is_array($input['productos'] ?? null) ? $input['productos'] : [];
        $notas = trim($input['notas'] ?? '');

        if (!$mesaId || empty($productos)) {
            responseError('Faltan datos para crear el pedido');
        }

        $mesaId = (int)$mesaId;

        $stmtMesa = $pdo->prepare("
        SELECT id, menu_id, num_comensales, estado
        FROM mesa
        WHERE id = ?
        LIMIT 1
    ");
        $stmtMesa->execute([$mesaId]);
        $mesa = $stmtMesa->fetch(PDO::FETCH_ASSOC);

        if (!$mesa) {
            responseError('La mesa no existe');
        }

        $pdo->beginTransaction();

        try {
            $usuarioId = $_SESSION['user_id'] ?? 1;

            $stmtPedido = $pdo->prepare("
            INSERT INTO pedido (mesa_id, usuario_id, estado, created_at, updated_at)
            VALUES (?, ?, 'pendiente', NOW(), NOW())
        ");
            $stmtPedido->execute([$mesaId, $usuarioId]);

            $pedidoId = (int)$pdo->lastInsertId();

            $stmtLinea = $pdo->prepare("
            INSERT INTO linea_pedido (pedido_id, producto_id, cantidad, precio_unitario, estado, observaciones)
            VALUES (?, ?, ?, ?, 'pendiente', ?)
        ");

            $totalProductos = 0.0;

            foreach ($productos as $producto) {
                $productoId = $producto['productoId'] ?? null;
                $cantidad = isset($producto['cantidad']) ? (int)$producto['cantidad'] : 0;
                $precio = $producto['precio'] ?? null;

                if (!$productoId || $cantidad <= 0 || $precio === null || $precio === '') {
                    throw new Exception('Línea de pedido inválida');
                }

                $productoId = (int)$productoId;
                $precio = (float)$precio;
                $subtotal = $precio * $cantidad;
                $totalProductos += $subtotal;

                $stmtLinea->execute([
                    $pedidoId,
                    $productoId,
                    $cantidad,
                    $precio,
                    $notas !== '' ? $notas : null
                ]);
            }

            $costeMenu = 0.0;
            $numComensales = max(0, (int)$mesa['num_comensales']);
            $totalMenu = 0.0;

            if (!empty($mesa['menu_id'])) {
                $stmtMenu = $pdo->prepare("
                SELECT coste
                FROM menu
                WHERE id = ?
                LIMIT 1
            ");
                $stmtMenu->execute([(int)$mesa['menu_id']]);
                $menu = $stmtMenu->fetch(PDO::FETCH_ASSOC);

                if ($menu) {
                    $costeMenu = (float)$menu['coste'];
                    $totalMenu = $costeMenu * $numComensales;
                }
            }

            $totalFacturado = $totalProductos;

            $stmtEstadoMesa = $pdo->prepare("
            UPDATE mesa
            SET estado = 'ocupada'
            WHERE id = ?
        ");
            $stmtEstadoMesa->execute([$mesaId]);

            $stmtHistorico = $pdo->prepare("
            INSERT INTO historico_mesa (
                mesa_id,
                num_comensales,
                menu_id,
                pedido_id,
                fecha_apertura,
                total_facturado
            ) VALUES (?, ?, ?, ?, NOW(), ?)
        ");
            $stmtHistorico->execute([
                $mesaId,
                $numComensales,
                $mesa['menu_id'] !== null ? (int)$mesa['menu_id'] : null,
                $pedidoId,
                $totalFacturado
            ]);

            $pdo->commit();

            responseOk([
                'ok' => true,
                'message' => 'Pedido creado correctamente',
                'pedidoId' => $pedidoId,
                'totalProductos' => $totalProductos,
                'costeMenu' => $costeMenu,
                'numComensales' => $numComensales,
                'totalMenu' => $totalMenu,
                'total' => $totalProductos + $totalMenu
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            responseError('Error al crear el pedido', 500, $e->getMessage());
        }
    }
    /**
     * actualizar_estado_pedido: cambia el estado global del pedido.
     * Estados válidos: pendiente → en preparacion → listo.
     */
    if ($entity === 'cocina' && $action === 'actualizar_estado_pedido') {
        $id = $input['id'] ?? null;
        $estado = trim($input['estado'] ?? '');

        $estadosValidos = ['pendiente', 'en preparacion', 'listo'];

        if (!$id || !in_array($estado, $estadosValidos, true)) {
            responseError('Datos inválidos para actualizar el pedido');
        }

        $stmt = $pdo->prepare("
        UPDATE pedido
        SET estado = ?, updated_at = NOW()
        WHERE id = ?
    ");
        $stmt->execute([$estado, $id]);

        responseOk([
            'ok' => true,
            'message' => 'Estado del pedido actualizado'
        ]);
    }

    /**
     * actualizar_estado_linea: cambia el estado de una línea individual.
     * Estados válidos: pendiente → en preparacion → lista → servido.
     * Tras actualizar la línea, recalcula el estado del pedido padre:
     *   - Si todas las líneas están en 'lista' o 'servido' → pedido 'listo'
     *   - Si alguna está 'en preparacion' → pedido 'en preparacion'
     *   - En otro caso → pedido 'pendiente'
     */
    if ($entity === 'cocina' && $action === 'actualizar_estado_linea') {
        $id = $input['id'] ?? null;
        $estado = trim($input['estado'] ?? '');

        $estadosValidosLinea = ['pendiente', 'en preparacion', 'lista', 'servido'];

        if (!$id || !in_array($estado, $estadosValidosLinea, true)) {
            responseError('Datos inválidos para actualizar la línea');
        }

        $stmtLinea = $pdo->prepare("
        SELECT pedido_id
        FROM linea_pedido
        WHERE id = ?
        LIMIT 1
    ");
        $stmtLinea->execute([$id]);
        $linea = $stmtLinea->fetch(PDO::FETCH_ASSOC);

        if (!$linea) {
            responseError('Línea no encontrada', 404);
        }

        $pedidoId = (int)$linea['pedido_id'];

        $stmt = $pdo->prepare("
        UPDATE linea_pedido
        SET estado = ?
        WHERE id = ?
    ");
        $stmt->execute([$estado, $id]);

        $stmtEstados = $pdo->prepare("
        SELECT estado
        FROM linea_pedido
        WHERE pedido_id = ?
    ");
        $stmtEstados->execute([$pedidoId]);
        $estadosLineas = $stmtEstados->fetchAll(PDO::FETCH_COLUMN);

        $nuevoEstadoPedido = 'pendiente';

        if (!empty($estadosLineas)) {
            $todosListosOServidos = true;
            $algunoEnPreparacion = false;

            foreach ($estadosLineas as $estadoLinea) {
                if ($estadoLinea === 'en preparacion') {
                    $algunoEnPreparacion = true;
                }

                if (!in_array($estadoLinea, ['lista', 'servido'], true)) {
                    $todosListosOServidos = false;
                }
            }

            if ($todosListosOServidos) {
                $nuevoEstadoPedido = 'listo';
            } elseif ($algunoEnPreparacion) {
                $nuevoEstadoPedido = 'en preparacion';
            }
        }

        $stmtPedido = $pdo->prepare("
        UPDATE pedido
        SET estado = ?, updated_at = NOW()
        WHERE id = ?
    ");
        $stmtPedido->execute([$nuevoEstadoPedido, $pedidoId]);

        responseOk([
            'ok' => true,
            'message' => 'Estado de la línea actualizado',
            'pedidoId' => $pedidoId,
            'pedidoEstado' => $nuevoEstadoPedido
        ]);
    }

    /**
     * terminar: libera la mesa sin borrar el histórico (a diferencia de 'cerrar').
     * Solo resetea el estado y el código de acceso. El histórico queda intacto
     * para consulta posterior.
     */
    if ($entity === 'mesas' && $action === 'terminar') {
        $id = $input['id'] ?? null;

        if (!$id) {
            responseError('ID de mesa obligatorio');
        }

        $stmtMesa = $pdo->prepare("
        SELECT id, numero
        FROM mesa
        WHERE id = ?
        LIMIT 1
    ");
        $stmtMesa->execute([$id]);
        $mesa = $stmtMesa->fetch(PDO::FETCH_ASSOC);

        if (!$mesa) {
            responseError('Mesa no encontrada', 404);
        }

        $stmt = $pdo->prepare("
        UPDATE mesa
        SET
            estado = 'libre',
            num_comensales = 0,
            menu_id = NULL,
            codigo_acceso = NULL,
            codigo_activo = 0,
            codigo_generado_at = NULL
        WHERE id = ?
    ");
        $stmt->execute([$id]);

        responseOk([
            'ok' => true,
            'message' => 'Mesa terminada correctamente',
            'mesa' => [
                'id' => (int)$mesa['id'],
                'numero' => $mesa['numero'],
                'estado' => 'libre',
                'numComensales' => 0,
                'menuId' => null,
                'codigoAcceso' => null,
                'codigoActivo' => 0,
                'codigoGeneradoAt' => null
            ]
        ]);
    }


    /**
     * historial_mesa: devuelve todos los registros del histórico de una mesa,
     * incluyendo las líneas de cada pedido. Ordenado por fecha de apertura DESC
     * para mostrar el más reciente primero.
     */
    if ($entity === 'pedidos' && $action === 'historial_mesa') {
        $mesaId = $input['mesaId'] ?? null;

        if (!$mesaId) {
            responseError('ID de mesa obligatorio');
        }

        $mesaId = (int)$mesaId;

        $stmt = $pdo->prepare("
        SELECT
            hm.id,
            hm.mesa_id,
            hm.num_comensales,
            hm.menu_id,
            hm.pedido_id,
            hm.fecha_apertura,
            hm.total_facturado,
            p.estado AS pedido_estado,
            p.created_at,
            p.updated_at
        FROM historico_mesa hm
        LEFT JOIN pedido p ON p.id = hm.pedido_id
        WHERE hm.mesa_id = ?
        ORDER BY hm.fecha_apertura DESC, hm.id DESC
    ");
        $stmt->execute([$mesaId]);
        $historial = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtLineas = $pdo->prepare("
        SELECT
            lp.id,
            lp.pedido_id,
            lp.producto_id,
            pr.nombre AS producto_nombre,
            lp.cantidad,
            lp.precio_unitario,
            lp.estado,
            lp.observaciones
        FROM linea_pedido lp
        INNER JOIN producto pr ON pr.id = lp.producto_id
        WHERE lp.pedido_id = ?
        ORDER BY lp.id ASC
    ");

        foreach ($historial as &$item) {
            $pedidoId = isset($item['pedido_id']) ? (int)$item['pedido_id'] : 0;
            $lineas = [];

            if ($pedidoId > 0) {
                $stmtLineas->execute([$pedidoId]);
                $lineas = $stmtLineas->fetchAll(PDO::FETCH_ASSOC);
            }

            $item = [
                'id' => (int)$item['id'],
                'mesaId' => (int)$item['mesa_id'],
                'numComensales' => isset($item['num_comensales']) ? (int)$item['num_comensales'] : 0,
                'menuId' => $item['menu_id'] !== null ? (int)$item['menu_id'] : null,
                'pedidoId' => $pedidoId > 0 ? $pedidoId : null,
                'fechaApertura' => $item['fecha_apertura'],
                'totalFacturado' => (float)$item['total_facturado'],
                'estado' => $item['pedido_estado'] ?? null,
                'pedidoEstado' => $item['pedido_estado'] ?? null,
                'createdAt' => $item['created_at'] ?? null,
                'updatedAt' => $item['updated_at'] ?? null,
                'lineas' => array_map(function ($linea) {
                    return [
                        'id' => (int)$linea['id'],
                        'pedidoId' => (int)$linea['pedido_id'],
                        'productoId' => (int)$linea['producto_id'],
                        'productoNombre' => $linea['producto_nombre'],
                        'cantidad' => (int)$linea['cantidad'],
                        'precioUnitario' => (float)$linea['precio_unitario'],
                        'estado' => $linea['estado'],
                        'observaciones' => $linea['observaciones'],
                    ];
                }, $lineas),
            ];
        }

        responseOk([
            'ok' => true,
            'historial' => $historial
        ]);
    }

    /**
     * eliminar_pedido: permite a cocina eliminar un pedido terminado (estado 'listo').
     * Borra primero las líneas (FK) y luego el pedido. Transacción para atomicidad.
     */
    if ($entity === 'cocina' && $action === 'eliminar_pedido') {
        $id = $input['id'] ?? null;

        if (!$id) {
            responseError('ID de pedido obligatorio');
        }

        $stmtPedido = $pdo->prepare("
        SELECT id, estado
        FROM pedido
        WHERE id = ?
        LIMIT 1
    ");
        $stmtPedido->execute([$id]);
        $pedido = $stmtPedido->fetch(PDO::FETCH_ASSOC);

        if (!$pedido) {
            responseError('Pedido no encontrado', 404);
        }

        if ($pedido['estado'] !== 'listo') {
            responseError('Solo se pueden eliminar pedidos en estado listo', 400);
        }

        $pdo->beginTransaction();

        try {
            $stmtLineas = $pdo->prepare("
            DELETE FROM linea_pedido
            WHERE pedido_id = ?
        ");
            $stmtLineas->execute([$id]);

            $stmtDeletePedido = $pdo->prepare("
            DELETE FROM pedido
            WHERE id = ?
        ");
            $stmtDeletePedido->execute([$id]);

            $pdo->commit();

            responseOk([
                'ok' => true,
                'message' => 'Pedido eliminado correctamente'
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            responseError('Error al eliminar el pedido', 500, $e->getMessage());
        }
    }
    // Si ningún bloque coincidió con entity+action, se devuelve 404
    responseError('Ruta no válida', 404);
} catch (Throwable $e) {
    // Captura cualquier excepción no controlada dentro del flujo principal
    responseError('Error interno del servidor', 500, $e->getMessage());
}
