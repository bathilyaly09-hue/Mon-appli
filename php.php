<?php
/**
 * ElecVision - API Backend
 * Propriétaire: Aly Bathily
 * Version: 2.0 - Sécurisée
 */

// Configuration de sécurité
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gestion des requêtes OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration de session sécurisée
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => true,
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true
]);

// Configuration
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('PROJECTS_DIR', __DIR__ . '/projets/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('API_KEY', bin2hex('ElecVision2024Secure'));

// Création des dossiers si inexistants
if (!file_exists(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
if (!file_exists(PROJECTS_DIR)) mkdir(PROJECTS_DIR, 0755, true);

// Fonction de logging sécurisé
function logActivity($message, $level = 'INFO') {
    $logFile = __DIR__ . '/logs/activity.log';
    $logDir = dirname($logFile);
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);
    
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $logEntry = "[$timestamp] [$level] [IP: $ip] $message" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// Fonction de validation des données
function validateInput($data, $type = 'string') {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    
    if ($type === 'project_name') {
        return preg_match('/^[a-zA-Z0-9_-]{3,50}$/', $data) ? $data : false;
    }
    
    return $data;
}

// Récupération des données JSON
$input = json_decode(file_get_contents('php://input'), true);
$action = $_POST['action'] ?? $input['action'] ?? $_GET['action'] ?? null;

if (!$action) {
    echo json_encode(['success' => false, 'error' => 'Aucune action spécifiée']);
    exit();
}

// Traitement des différentes actions
switch ($action) {
    
    case 'save':
        // Sauvegarde de projet
        if (!isset($input['project'])) {
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            break;
        }
        
        $project = $input['project'];
        $projectId = validateInput($project['id'] ?? $project['name'], 'project_name');
        
        if (!$projectId) {
            echo json_encode(['success' => false, 'error' => 'Nom de projet invalide']);
            break;
        }
        
        $filename = PROJECTS_DIR . $projectId . '.json';
        $project['server_saved_at'] = date('Y-m-d H:i:s');
        $project['server_ip'] = $_SERVER['REMOTE_ADDR'];
        
        if (file_put_contents($filename, json_encode($project, JSON_PRETTY_PRINT))) {
            logActivity("Projet sauvegardé: $projectId");
            echo json_encode(['success' => true, 'message' => 'Projet sauvegardé sur le serveur']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Erreur d\'écriture']);
        }
        break;
    
    case 'load':
        // Chargement de projet
        $projectId = validateInput($_GET['id'] ?? $input['id'] ?? '', 'project_name');
        
        if (!$projectId) {
            echo json_encode(['success' => false, 'error' => 'ID projet invalide']);
            break;
        }
        
        $filename = PROJECTS_DIR . $projectId . '.json';
        
        if (file_exists($filename)) {
            $data = file_get_contents($filename);
            logActivity("Projet chargé: $projectId");
            echo json_encode(['success' => true, 'data' => $data]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Projet non trouvé']);
        }
        break;
    
    case 'list':
        // Liste des projets
        $projects = [];
        $files = glob(PROJECTS_DIR . '*.json');
        
        foreach ($files as $file) {
            $content = file_get_contents($file);
            $project = json_decode($content, true);
            if ($project) {
                $projects[] = [
                    'id' => $project['id'],
                    'name' => $project['name'],
                    'date' => $project['date'] ?? filemtime($file),
                    'size' => filesize($file)
                ];
            }
        }
        
        usort($projects, function($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });
        
        echo json_encode(['success' => true, 'projects' => $projects]);
        break;
    
    case 'delete':
        // Suppression de projet
        $projectId = validateInput($input['id'] ?? '', 'project_name');
        
        if (!$projectId) {
            echo json_encode(['success' => false, 'error' => 'ID projet invalide']);
            break;
        }
        
        $filename = PROJECTS_DIR . $projectId . '.json';
        
        if (unlink($filename)) {
            logActivity("Projet supprimé: $projectId");
            echo json_encode(['success' => true, 'message' => 'Projet supprimé']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Erreur lors de la suppression']);
        }
        break;
    
    case 'payment':
        // Simulation de paiement (à connecter avec API réelle Orange Money/Wave)
        $paymentData = $input['payment'] ?? [];
        
        if (empty($paymentData)) {
            echo json_encode(['success' => false, 'error' => 'Données de paiement invalides']);
            break;
        }
        
        // Log de la demande de paiement
        logActivity("Demande de paiement: " . json_encode($paymentData));
        
        // Ici vous intégrez l'API réelle d'Orange Money ou Wave
        // Pour l'instant, simulation
        $transactionId = 'TXN' . time() . rand(1000, 9999);
        
        echo json_encode([
            'success' => true,
            'transaction_id' => $transactionId,
            'status' => 'pending',
            'message' => 'Demande de paiement envoyée. Veuillez vérifier votre téléphone.'
        ]);
        break;
    
    case 'backup':
        // Sauvegarde complète
        $backupFile = UPLOAD_DIR . 'backup_' . date('Ymd_His') . '.zip';
        $zip = new ZipArchive();
        
        if ($zip->open($backupFile, ZipArchive::CREATE) === TRUE) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(PROJECTS_DIR),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            
            foreach ($files as $name => $file) {
                if (!$file->isDir()) {
                    $filePath = $file->getRealPath();
                    $relativePath = substr($filePath, strlen(PROJECTS_DIR));
                    $zip->addFile($filePath, 'projets/' . $relativePath);
                }
            }
            
            $zip->close();
            logActivity("Backup créé: " . basename($backupFile));
            echo json_encode(['success' => true, 'backup_file' => basename($backupFile)]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Erreur lors de la création du backup']);
        }
        break;
    
    case 'health':
        // Vérification de l'état du serveur
        echo json_encode([
            'success' => true,
            'status' => 'online',
            'version' => '2.0',
            'timestamp' => date('c'),
            'owner' => 'Aly Bathily',
            'disk_free' => disk_free_space(__DIR__),
            'projects_count' => count(glob(PROJECTS_DIR . '*.json'))
        ]);
        break;
    
    default:
        echo json_encode(['success' => false, 'error' => 'Action inconnue']);
        break;
}
?>