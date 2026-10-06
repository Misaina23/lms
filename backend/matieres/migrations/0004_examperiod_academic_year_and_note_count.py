from django.db import migrations, models


def assign_academic_years(apps, schema_editor):
    ExamPeriod = apps.get_model('matieres', 'ExamPeriod')
    for period in ExamPeriod.objects.all().iterator():
        start_year = period.start_date.year if period.start_date.month >= 8 else period.start_date.year - 1
        period.academic_year = f'{start_year}-{start_year + 1}'
        period.save(update_fields=['academic_year'])


class Migration(migrations.Migration):

    dependencies = [
        ('matieres', '0003_matiere_coefficient'),
    ]

    operations = [
        migrations.AddField(
            model_name='examperiod',
            name='academic_year',
            field=models.CharField(max_length=9, null=True),
        ),
        migrations.AddField(
            model_name='examperiod',
            name='number_of_notes',
            field=models.PositiveSmallIntegerField(
                choices=[(1, 'Une note'), (2, 'Deux notes')],
                default=2,
            ),
        ),
        migrations.RunPython(assign_academic_years, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='examperiod',
            name='code',
            field=models.CharField(max_length=10),
        ),
        migrations.AlterField(
            model_name='examperiod',
            name='period_type',
            field=models.CharField(
                choices=[
                    ('T1', 'Trimestre 1'),
                    ('T2', 'Trimestre 2'),
                    ('T3', 'Trimestre 3'),
                    ('T4', 'Trimestre 4'),
                    ('S1', 'Semestre 1'),
                    ('S2', 'Semestre 2'),
                ],
                max_length=5,
            ),
        ),
        migrations.AlterField(
            model_name='examperiod',
            name='academic_year',
            field=models.CharField(max_length=9),
        ),
        migrations.AlterUniqueTogether(
            name='examperiod',
            unique_together={('academic_year', 'code')},
        ),
    ]
