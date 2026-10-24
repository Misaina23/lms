from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('matieres', '0006_remove_matiere_description_and_default_coefficient'),
    ]

    operations = [
        migrations.AddField(
            model_name='examperiod',
            name='bulletin_weight',
            field=models.DecimalField(
                decimal_places=2,
                default=1,
                help_text='Weight of this period in the annual bulletin average',
                max_digits=4,
            ),
        ),
    ]
