# Migration: Etudiant n'est plus lie a CustomUser, champs propres ajoutes
# Idempotente : detecte l'etat actuel et applique les changements si necessaire

from django.db import migrations, models


def _column_exists(cursor, table_name, column_name):
    cursor.execute("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    """, [table_name, column_name])
    return cursor.fetchone() is not None


def _migrate_from_user(apps, schema_editor):
    """Peuple les champs propres depuis CustomUser si user_id existe encore."""
    cursor = schema_editor.connection.cursor()
    if not _column_exists(cursor, 'etudiants_etudiant', 'user_id'):
        return

    CustomUser = apps.get_model('users', 'CustomUser')
    users_data = {u.id: u for u in CustomUser.objects.all()}

    cursor.execute('SELECT id, user_id FROM etudiants_etudiant')
    for etudiant_id, user_id in cursor.fetchall():
        user = users_data.get(user_id)
        first_name = user.first_name or '' if user else ''
        last_name = user.last_name or '' if user else ''
        matricule = user.matricule or f'ELV-OLD-{etudiant_id}' if user else f'ELV-OLD-{etudiant_id}'
        phone = user.phone or '' if user else ''
        cursor.execute(
            'UPDATE etudiants_etudiant SET first_name = %s, last_name = %s, matricule = %s, phone = %s WHERE id = %s',
            [first_name, last_name, matricule, phone, etudiant_id],
        )


def _drop_user_column(apps, schema_editor):
    """Supprime la colonne user_id si elle existe."""
    cursor = schema_editor.connection.cursor()
    if _column_exists(cursor, 'etudiants_etudiant', 'user_id'):
        cursor.execute('ALTER TABLE etudiants_etudiant DROP COLUMN user_id')


def _cleanup_eleve_users(apps, schema_editor):
    """Supprime les CustomUser de type ELEVE."""
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
        migrations.RunPython(_migrate_from_user, migrations.RunPython.noop),
        migrations.RunPython(_drop_user_column, migrations.RunPython.noop),
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
        migrations.AlterField(
            model_name='etudiant',
            name='matricule',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.RunPython(_cleanup_eleve_users, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together={('student', 'academic_year')},
        ),
    ]