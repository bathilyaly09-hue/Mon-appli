<?php
/**
 * ElecVision - Configuration
 * Propriétaire: Aly Bathily
 * À placer hors du dossier public si possible
 */

// Configuration base de données (si vous passez à MySQL plus tard)
define('DB_HOST', 'localhost');
define('DB_NAME', 'elecvision');
define('DB_USER', 'elecvision_user');
define('DB_PASS', 'CHANGE_THIS_STRONG_PASSWORD');

// Configuration email
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'noreply@elecvision.sn');
define('SMTP_PASS', 'CHANGE_THIS');

// Configuration API Orange Money (à remplacer par vos identifiants réels)
define('ORANGE_MONEY_API_URL', 'https://api.orange.com/orange-money-webpay/dev/v1');
define('ORANGE_MONEY_CLIENT_ID', 'YOUR_CLIENT_ID');
define('ORANGE_MONEY_CLIENT_SECRET', 'YOUR_CLIENT_SECRET');

// Configuration Wave (à remplacer par vos identifiants réels)
define('WAVE_API_KEY', 'YOUR_WAVE_API_KEY');
define('WAVE_API_SECRET', 'YOUR_WAVE_API_SECRET');

// Configuration sécurisée
define('SECURITY_SALT', bin2hex(random_bytes(32)));
define('ENCRYPTION_KEY', bin2hex(random_bytes(32)));

// Configuration du propriétaire
define('APP_OWNER', 'Aly Bathily');
define('APP_OWNER_PHONE', '+221781255060');
define('APP_OWNER_EMAIL', 'aly.bathily@elecvision.sn');

// Mode debug (à désactiver en production)
define('DEBUG_MODE', false);
?>