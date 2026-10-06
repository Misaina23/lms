# Démonstration locale

Depuis le dossier `backend`, lancez :

```text
python manage.py seed_demo_portal --allow-insecure-passwords
```

La commande est refusée lorsque `DEBUG=False`. Elle ne vide pas la base de données ; les comptes déjà présents ne voient pas leur mot de passe remplacé.

Comptes créés sur une base locale vide :

| Rôle | Adresse | Mot de passe initial |
|---|---|---|
| Administration | admin@gmail.com | 123456 |
| Enseignant de mathématiques | enseignantmath@gmail.com | 123456 |
| Surveillant | surveillant1@gmail.com | 123456 |

Le jeu de données comprend les classes Seconde A/B/C, Première L/S/OSE et Terminale L/S/OSE, avec cinq élèves par classe. Ces identifiants ne doivent pas être utilisés ni exposés sur une instance publique.

## Réinitialisation du mot de passe en production

Le développement utilise la console Django pour l’envoi de courriels. En production, configurez sur Render un fournisseur SMTP avec `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` et `DEFAULT_FROM_EMAIL`. `FRONTEND_URL` doit pointer vers l’URL publique du portail afin que les liens reçus ouvrent la bonne page.
