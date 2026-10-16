# Démonstration locale

Depuis le dossier `backend`, lancez :

```text
python manage.py seed_demo_portal --allow-insecure-passwords
```

La commande est refusée lorsque `DEBUG=False`. Elle ne vide pas la base de données ; les comptes déjà présents ne voient pas leur mot de passe remplacé.

## Seed automatique sur Render

En production, `start.sh` lance les migrations puis démarre immédiatement le serveur. Le seed de démonstration est désactivé par défaut (`SEED_DEMO_DATA=false` dans `render.yaml`) afin qu’il ne ralentisse pas le démarrage du service et n’ajoute pas de données de démonstration à la base réelle. Pour le lancer volontairement une seule fois, définissez temporairement `SEED_DEMO_DATA=true` dans les variables Render, redéployez, puis remettez `false` après confirmation de la création des données. La commande est réexécutable sans dupliquer les données.

Le seed de production :

```text
python manage.py seed_demo_portal --production
```

Cette option ne fonctionne qu'avec `DEBUG=False`. Elle crée neuf classes et 45 élèves, et génère un mot de passe aléatoire fort pour chaque compte de démonstration nouvellement créé. Les mots de passe sont affichés une seule fois dans les journaux du premier démarrage : conservez-les de manière sûre et transmettez-les aux personnes autorisées. Ne copiez pas cette sortie dans le dépôt ou dans un journal public. Les mots de passe des comptes préexistants ne sont pas modifiés.

Le seed de production ajoute des dossiers explicitement identifiés comme données de démonstration dans la base réelle.

## Variables de sécurité en production

Configurez `DJANGO_SECRET_KEY` avec une valeur secrète non vide, `DEBUG=False` et `ALLOWED_HOSTS` avec les noms d'hôte exacts. La clé de développement `django-insecure-...` reste interdite en production, mais la valeur existante n'a pas à être renouvelée ni à atteindre une longueur minimale. Le mode production active la redirection HTTPS, HSTS et les cookies sécurisés ; le proxy doit définir `X-Forwarded-Proto` conformément à sa configuration de confiance. Le démarrage exige aussi un `SUPERUSER_PASSWORD` qui respecte les validateurs Django ; aucun mot de passe par défaut n'est utilisé. Dans Render, définissez ces valeurs comme secrets et ne les publiez pas dans le dépôt.

Comptes créés sur une base locale vide :

| Rôle | Adresse | Mot de passe initial |
|---|---|---|
| Administration | admin@gmail.com | 123456 |
| Enseignant de mathématiques | enseignantmath@gmail.com | 123456 |
| Surveillant | surveillant1@gmail.com | 123456 |

Le jeu de données comprend les classes Seconde A/B/C, Première L/S/OSE et Terminale L/S/OSE, avec cinq élèves par classe. Ces mots de passe `123456` et identifiants sont réservés à la démo locale et ne doivent pas être utilisés ni exposés sur une instance publique.

## Réinitialisation du mot de passe en production

Le développement utilise la console Django pour l’envoi de courriels. En production, configurez sur Render un fournisseur SMTP avec `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` et `DEFAULT_FROM_EMAIL`. `FRONTEND_URL` doit pointer vers l’URL publique du portail afin que les liens reçus ouvrent la bonne page.
