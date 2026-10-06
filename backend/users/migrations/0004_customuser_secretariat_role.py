from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_customuser_base_salary'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Administrateur'),
                    ('PROFESSEUR', 'Professeur'),
                    ('ELEVE', 'Élève'),
                    ('PARENT', 'Parent'),
                    ('SURVEILLANT', 'Surveillant'),
                    ('SECRETARIAT', 'Secrétariat'),
                ],
                max_length=20,
            ),
        ),
    ]
