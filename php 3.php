<?php
/**
 * ElecVision - Script d'installation
 * À SUPPRIMER après installation
 */

echo "<!DOCTYPE html>
<html>
<head>
    <title>Installation ElecVision</title>
    <style>
        body { font-family: monospace; background: #667eea; padding: 50px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; }
        h1 { color: #667eea; }
        .step { margin: 20px 0; padding: 15px; background: #f7fafc; border-radius: 10px; }
        .success { color: #48bb78; }
        .error { color: #e53e3e; }
        button { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>⚡ Installation ElecVision</h1>
        <p>Propriétaire: Aly Bathily</p>";

// Vérification des dossiers
$directories = ['uploads', 'projets', 'logs', 'backups'];
foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        if (mkdir($dir, 0755, true)) {
            echo "<div class='step'><span class='success'>✓</span> Dossier créé: $dir</div>";
        } else {
            echo "<div class='step'><span class='error'>✗</span> Erreur création: $dir</div>";
        }
    } else {
        echo "<div class='step'><span class='success'>✓</span> Dossier existant: $dir</div>";
    }
}

// Création du fichier .htaccess par défaut
$htaccess = "# ElecVision Security
Options -Indexes
<FilesMatch \"\.(json|log|txt)$\">
    Order allow,deny
    Deny from all
</FilesMatch>";

if (file_put_contents('.htaccess', $htaccess)) {
    echo "<div class='step'><span class='success'>✓</span> Fichier .htaccess créé</div>";
}

// Vérification de PHP
echo "<div class='step'>";
echo "<strong>Configuration PHP:</strong><br>";
echo "Version PHP: " . phpversion() . "<br>";
echo "Upload max size: " . ini_get('upload_max_filesize') . "<br>";
echo "Post max size: " . ini_get('post_max_size') . "<br>";
echo "Memory limit: " . ini_get('memory_limit') . "<br>";
echo "</div>";

// Instructions finales
echo "<div class='step'>
        <strong>Installation terminée !</strong><br><br>
        <strong>À faire:</strong><br>
        1. Configurez config.php avec vos identifiants<br>
        2. Testez l'application: <a href='index.html'>Ouvrir ElecVision</a><br>
        3. <strong style='color:#e53e3e;'>IMPORTANT: Supprimez install.php après installation !</strong><br><br>
        <a href='index.html'><button>Accéder à ElecVision</button></a>
      </div>";

echo "
    </div>
</body>
</html>";
?>