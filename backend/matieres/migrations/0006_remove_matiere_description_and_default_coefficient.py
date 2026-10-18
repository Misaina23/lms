from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('matieres', '0005_alter_examperiod_period_type'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='matiere',
            name='description',
        ),
        migrations.RemoveField(
            model_name='matiere',
            name='coefficient',
        ),
    ]
