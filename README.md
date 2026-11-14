# ElecVision

Outil web local de préparation de plans électriques et de devis estimatifs. Cette version fournit un éditeur 2D, une estimation indicative, l'impression en PDF via le navigateur, des sauvegardes locales, et une API PHP optionnelle avec comptes et projets SQLite privés par utilisateur.

> Les calculs ne sont pas une étude électrique certifiée. Faites vérifier les sections, protections et la conformité par un professionnel qualifié. Les paiements Orange Money/Wave ne sont pas activés : aucune transaction réelle n'est effectuée.

## Prérequis

- PHP 8.1 ou plus récent avec les extensions `pdo_sqlite` et `sqlite3` activées.
- Navigateur moderne. Fabric.js est chargé depuis un CDN, donc une connexion internet est requise pour le canevas.

## Démarrage local

Depuis la racine du dépôt :

```bash
php -S 127.0.0.1:8000
```

Ouvrir <http://127.0.0.1:8000/>. La base SQLite est créée automatiquement dans `storage/` au premier appel à l'API. Les projets peuvent être sauvegardés localement sans compte. Pour les synchroniser sur le serveur, créez un compte depuis le bouton **Connexion**.

Vérifier la syntaxe du backend :

```bash
php -l api.php
```

## Fonctionnalités

- Plan 2D : symboles d'équipements, sélection/déplacement, suppression, tracé de câbles, import d'un plan image.
- Estimation indicative : longueur, quantités, matériel, câble et main-d'œuvre ; impression/enregistrement PDF via la boîte de dialogue du navigateur.
- Mode local : projets conservés dans le stockage local du navigateur.
- Mode compte : inscription/connexion PHP, mots de passe hachés, session HttpOnly/SameSite, jeton CSRF, SQLite et projets isolés par utilisateur.
- Les demandes de paiement sont volontairement désactivées tant qu'une intégration marchande officielle n'est pas configurée.

## Déploiement

Hébergez la racine sur un serveur PHP compatible, activez PDO SQLite et autorisez PHP à écrire dans `storage/`. Servez le site exclusivement en HTTPS en production. Le fichier `storage/.htaccess` interdit l'accès HTTP direct à la base sous Apache ; configurez la règle équivalente si vous utilisez un autre serveur. N'exposez jamais les fichiers de stockage, journaux ou sauvegardes.

Avant une mise en production, ajoutez une limitation des tentatives de connexion, une politique de sauvegarde/restauration, une procédure de réinitialisation de mot de passe et les exigences légales applicables. Les paiements nécessitent un contrat marchand, des identifiants obtenus auprès du fournisseur, des notifications/webhooks vérifiés côté serveur et des tests de conformité. Ne placez aucun secret fournisseur dans le dépôt ou le navigateur.

## Fichiers historiques

`html.html`, `javascript.js`, `css.css` et `php.php` sont les fichiers de la maquette d'origine. Le point d'entrée maintenu est désormais `index.html`, avec `app.js`, `app.css` et `api.php`. L'ancien code PHP n'est pas l'API à déployer.
