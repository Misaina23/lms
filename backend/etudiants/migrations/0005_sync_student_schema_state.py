import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0001_initial'),
        ('etudiants', '0004_etudiant_remove_user_add_own_fields'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(
                    model_name='etudiant',
                    name='user',
                ),
            ],
        ),
        migrations.AlterModelOptions(
            name='etudiant',
            options={'ordering': ['last_name', 'first_name']},
        ),
        migrations.AlterField(
            model_name='enrollment',
            name='devise',
            field=models.CharField(
                default='MGA',
                help_text='Devise des paiements',
                max_length=3,
            ),
        ),
        migrations.AlterField(
            model_name='etudiant',
            name='classe',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='etudiants',
                to='classes.classe',
            ),
        ),
        migrations.AlterField(
            model_name='etudiant',
            name='first_name',
            field=models.CharField(max_length=150),
        ),
        migrations.AlterField(
            model_name='etudiant',
            name='last_name',
            field=models.CharField(max_length=150),
        ),
    ]
