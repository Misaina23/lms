# Migration: Etudiant n'est plus lie a CustomUser, champs propres ajoutes

from django.db import migrations, models


# Stockage temporaire entre les deux RunPython
_etudiant_data_cache = {}


def cache_etudiant_user_data(apps, schema_editor):
    """Lit user_id et stocke les donnees utilisateur avant suppression du champ."""
    Etudiant = apps.get_model('etudiants', 'Etudiant')
    CustomUser = apps.get_model('users', 'CustomUser')
    users_data = {u.id: u for u in CustomUser.objects.all()}
    cursor = schema_editor.connection.cursor()
    for etudiant in Etudiant.objects.all():
        cursor.execute(
            'SELECT user_id FROM etudiants_etudiant WHERE id = %s',
            [etudiant.id]
        )
        row = cursor.fetchone()
        user_id = row[0] if row else None
        user = users_data.get(user_id)
        _etudiant_data_cache[str(etudiant.id)] = {
            'first_name': user.first_name or '' if user else '',
            'last_name': user.last_name or '' if user else '',
            'matricule': user.matricule or f'ELV-OLD-{etudiant.id}' if user else f'ELV-OLD-{etudiant.id}',
            'phone': user.phone or '' if user else '',
        }


def populate_etudiant_fields(apps, schema_editor):
    """Peuple les nouveaux champs depuis le cache via SQL direct."""
    cursor = schema_editor.connection.cursor()
    rows = []
    for etudiant_id, data in _etudiant_data_cache.items():
        rows.append((
            data['first_name'],
            data['last_name'],
            data['matricule'],
            data['phone'],
            etudiant_id,
        ))
    if rows:
        cursor.executemany(
            'UPDATE etudiants_etudiant SET first_name = %s, last_name = %s, matricule = %s, phone = %s WHERE id = %s',
            rows,
        )


def cleanup_eleve_users(apps, schema_editor):
    """Supprime les CustomUser de type ELEVE (ils ne sont plus utilises)."""
    CustomUser = apps.get_model('users', 'CustomUser')
    CustomUser.objects.filter(role='ELEVE').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('etudiants', '0003_enrollment_devise_enrollment_frais_total_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together=set(),
        ),
        migrations.RunPython(cache_etudiant_user_data, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='etudiant',
            name='user',
        ),
        migrations.AddField(
            model_name='etudiant',
            name='matricule',
            field=models.CharField(max_length=50, unique=True, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='first_name',
            field=models.CharField(max_length=150, default=''),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='last_name',
            field=models.CharField(max_length=150, default=''),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='date_of_birth',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='gender',
            field=models.CharField(blank=True, choices=[('M', 'Masculin'), ('F', 'Féminin')], max_length=1, null=True),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='phone',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='email_parent',
            field=models.EmailField(blank=True, help_text="Email du parent/tuteur"),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='phone_parent',
            field=models.CharField(blank=True, help_text="Téléphone du parent/tuteur", max_length=20),
        ),
        migrations.AddField(
            model_name='etudiant',
            name='address',
            field=models.TextField(blank=True),
        ),
        migrations.RunPython(populate_etudiant_fields, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='etudiant',
            name='matricule',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.RunPython(cleanup_eleve_users, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together={('student', 'academic_year')},
        ),
    ]
