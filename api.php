<?php
declare(strict_types=1);

// ElecVision JSON API. Requires PHP 8.1+ with PDO_SQLite enabled.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('elecvision_session');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function respond(array $data, int $status = 200): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit; }
function input(): array { $raw = file_get_contents('php://input'); if (strlen($raw) > 2_000_000) respond(['success'=>false,'error'=>'Requête trop volumineuse.'], 413); $data = json_decode($raw ?: '[]', true); if (!is_array($data)) respond(['success'=>false,'error'=>'JSON invalide.'], 400); return $data; }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32)); return $_SESSION['csrf']; }
function requireCsrf(): void { $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''; if (!is_string($sent) || !hash_equals(csrf(), $sent)) respond(['success'=>false,'error'=>'Session expirée. Actualisez la page et réessayez.'], 403); }
function currentUser(): ?array { return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null; }
function requireUser(): array { $user = currentUser(); if (!$user) respond(['success'=>false,'error'=>'Connectez-vous pour continuer.'], 401); return $user; }
function database(): PDO {
    static $pdo = null; if ($pdo instanceof PDO) return $pdo;
    $dir = __DIR__ . '/storage'; if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) respond(['success'=>false,'error'=>'Impossible de créer le stockage.'], 500);
    $pdo = new PDO('sqlite:' . $dir . '/elecvision.sqlite', null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS projects (id TEXT NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, project_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id,id))');
    return $pdo;
}
function validEmail(mixed $email): bool { return is_string($email) && strlen($email) <= 190 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false; }
function projectId(mixed $id): bool { return is_string($id) && preg_match('/^[a-zA-Z0-9_-]{1,80}$/', $id) === 1; }

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
$action = $_GET['action'] ?? '';
try {
    $db = database();
    if ($action === 'session' && $_SERVER['REQUEST_METHOD'] === 'GET') respond(['success'=>true,'user'=>currentUser(),'csrf'=>csrf()]);
    if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        requireCsrf(); $data = input(); $email = strtolower(trim((string)($data['email'] ?? ''))); $password = $data['password'] ?? '';
        if (!validEmail($email)) respond(['success'=>false,'error'=>'Adresse e-mail invalide.'], 422);
        if (!is_string($password) || strlen($password) < 10 || strlen($password) > 200) respond(['success'=>false,'error'=>'Le mot de passe doit contenir entre 10 et 200 caractères.'], 422);
        $stmt = $db->prepare('INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)');
        try { $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), gmdate('c')]); } catch (PDOException $e) { if (str_contains(strtolower($e->getMessage()), 'unique')) respond(['success'=>false,'error'=>'Un compte existe déjà pour cette adresse.'], 409); throw $e; }
        session_regenerate_id(true); $_SESSION['user'] = ['id'=>(int)$db->lastInsertId(),'email'=>$email]; $_SESSION['csrf'] = bin2hex(random_bytes(32)); respond(['success'=>true,'user'=>currentUser(),'csrf'=>csrf()], 201);
    }
    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        requireCsrf(); $data = input(); $email = strtolower(trim((string)($data['email'] ?? ''))); $password = $data['password'] ?? '';
        if (!validEmail($email) || !is_string($password)) respond(['success'=>false,'error'=>'Identifiants incorrects.'], 401);
        $stmt = $db->prepare('SELECT id,email,password_hash FROM users WHERE email = ?'); $stmt->execute([$email]); $row = $stmt->fetch();
        if (!$row || !password_verify($password, $row['password_hash'])) respond(['success'=>false,'error'=>'Identifiants incorrects.'], 401);
        if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) { $up = $db->prepare('UPDATE users SET password_hash=? WHERE id=?'); $up->execute([password_hash($password,PASSWORD_DEFAULT),$row['id']]); }
        session_regenerate_id(true); $_SESSION['user'] = ['id'=>(int)$row['id'],'email'=>$row['email']]; $_SESSION['csrf'] = bin2hex(random_bytes(32)); respond(['success'=>true,'user'=>currentUser(),'csrf'=>csrf()]);
    }
    if ($action === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); $_SESSION = []; if (ini_get('session.use_cookies')) { $p=session_get_cookie_params(); setcookie(session_name(),'',time()-42000,$p['path'],$p['domain'] ?? '',$p['secure'],$p['httponly']); } session_destroy(); respond(['success'=>true]); }
    if (str_starts_with($action, 'project_')) {
        $user = requireUser();
        if ($action === 'project_list' && $_SERVER['REQUEST_METHOD'] === 'GET') { $stmt=$db->prepare('SELECT id,name,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC'); $stmt->execute([$user['id']]); respond(['success'=>true,'projects'=>$stmt->fetchAll()]); }
        if ($action === 'project_load' && $_SERVER['REQUEST_METHOD'] === 'GET') { $id=$_GET['id'] ?? ''; if (!projectId($id)) respond(['success'=>false,'error'=>'Identifiant invalide.'],422); $stmt=$db->prepare('SELECT project_json FROM projects WHERE user_id=? AND id=?'); $stmt->execute([$user['id'],$id]); $row=$stmt->fetch(); if (!$row) respond(['success'=>false,'error'=>'Projet introuvable.'],404); respond(['success'=>true,'project'=>json_decode($row['project_json'],true)]); }
        if ($action === 'project_save' && $_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); $data=input(); $p=$data['project'] ?? null; if (!is_array($p) || !projectId($p['id'] ?? null)) respond(['success'=>false,'error'=>'Données projet invalides.'],422); $name=trim((string)($p['name'] ?? '')); if ($name==='' || mb_strlen($name)>100) respond(['success'=>false,'error'=>'Le nom doit contenir de 1 à 100 caractères.'],422); $json=json_encode($p,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE); if ($json===false || strlen($json)>1_500_000) respond(['success'=>false,'error'=>'Projet trop volumineux ou invalide.'],413); $stmt=$db->prepare('INSERT INTO projects(id,user_id,name,project_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET name=excluded.name,project_json=excluded.project_json,updated_at=excluded.updated_at'); $stmt->execute([$p['id'],$user['id'],$name,$json,gmdate('c')]); respond(['success'=>true]); }
        if ($action === 'project_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); $id=input()['id'] ?? ''; if (!projectId($id)) respond(['success'=>false,'error'=>'Identifiant invalide.'],422); $stmt=$db->prepare('DELETE FROM projects WHERE user_id=? AND id=?'); $stmt->execute([$user['id'],$id]); if (!$stmt->rowCount()) respond(['success'=>false,'error'=>'Projet introuvable.'],404); respond(['success'=>true]); }
    }
    if ($action === 'payment' && $_SERVER['REQUEST_METHOD'] === 'POST') { respond(['success'=>false,'error'=>'Les paiements réels ne sont pas configurés. Aucune transaction n’a été effectuée.'],501); }
    respond(['success'=>false,'error'=>'Action ou méthode non prise en charge.'], 404);
} catch (Throwable $e) {
    error_log('[ElecVision API] ' . $e->getMessage());
    respond(['success'=>false,'error'=>'Erreur interne. Consultez les journaux du serveur.'], 500);
}
