# Démonstration locale

Depuis le dossier `backend`, lancez :

```text
python manage.py seed_demo_portal --allow-insecure-passwords
```

La commande est refusée lorsque `DEBUG=False`. Elle ne vide pas la base de données ; les comptes déjà présents ne voient pas leur mot de passe remplacé.

## Seed explicite sur Render

Pour créer les classes et élèves de démonstration sur la base Render, ouvrez le Shell du service backend et lancez manuellement :

```text
python manage.py seed_demo_portal --production
```

Cette option ne fonctionne qu'avec `DEBUG=False`. Elle crée les mêmes neuf classes et 45 élèves, et génère un mot de passe aléatoire fort pour chaque compte de démonstration nouvellement créé. Les mots de passe sont affichés une seule fois dans la sortie de la commande : conservez-les de manière sûre et transmettez-les aux personnes autorisées. Ne copiez pas cette sortie dans le dépôt ou dans un journal public. Les mots de passe des comptes préexistants ne sont pas modifiés. Le seed est réexécutable sans dupliquer classes, élèves ou affectations.

Le seed de production ajoute des dossiers explicitement identifiés comme données de démonstration dans la base réelle. Exécutez-le uniquement si vous souhaitez que ces données apparaissent dans le portail public.

Comptes créés sur une base locale vide :

| Rôle | Adresse | Mot de passe initial |
|---|---|---|
| Administration | admin@gmail.com | 123456 |
| Enseignant de mathématiques | enseignantmath@gmail.com | 123456 |
| Surveillant | surveillant1@gmail.com | 123456 |

Le jeu de données comprend les classes Seconde A/B/C, Première L/S/OSE et Terminale L/S/OSE, avec cinq élèves par classe. Ces mots de passe `123456` et identifiants sont réservés à la démo locale et ne doivent pas être utilisés ni exposés sur une instance publique.

## Réinitialisation du mot de passe en production

Le développement utilise la console Django pour l’envoi de courriels. En production, configurez sur Render un fournisseur SMTP avec `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` et `DEFAULT_FROM_EMAIL`. `FRONTEND_URL` doit pointer vers l’URL publique du portail afin que les liens reçus ouvrent la bonne page.
