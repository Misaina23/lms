from collections import defaultdict
from datetime import time

from classes.models import Classe, TeacherAssignment
from users.models import CustomUser
from .models import TimetableSlot


SCHOOL_DAYS = range(6)
AVAILABLE_START_MINUTES = (480, 540, 600, 660, 780, 840, 900, 960)
LESSON_DURATION_MINUTES = 60


def _minutes(value):
    return value.hour * 60 + value.minute


def _time(value):
    return time(value // 60, value % 60)


def _overlaps(day, start, end, slot):
    return (
        slot.day_of_week == day
        and start < _minutes(slot.end_hour)
        and _minutes(slot.start_hour) < end
    )


def generate_schedule(academic_year, requests):
    classes = {
        classe.pk: classe
        for classe in Classe.objects.filter(
            pk__in={item['class_id'] for item in requests},
            academic_year=academic_year,
        )
    }
    if len(classes) != len({item['class_id'] for item in requests}):
        raise ValueError('Toutes les classes doivent appartenir à l’année scolaire choisie.')

    assignment_rows = TeacherAssignment.objects.filter(
        classe_id__in=classes,
        academic_year=academic_year,
        professeur__role=CustomUser.Role.PROFESSEUR,
        professeur__status=CustomUser.Status.ACTIVE,
        professeur__is_active=True,
    ).select_related('professeur')
    teacher_options = defaultdict(list)
    for assignment in assignment_rows:
        teacher_options[(assignment.classe_id, assignment.matiere_id)].append(
            assignment.professeur
        )

    sessions = []
    seen_pairs = set()
    for item in requests:
        pair = (item['class_id'], item['subject_id'])
        if pair in seen_pairs:
            raise ValueError('Chaque couple classe/matière doit apparaître une seule fois.')
        seen_pairs.add(pair)
        if not teacher_options[pair]:
            raise ValueError(
                f"Aucun enseignant actif n’est affecté à la matière demandée pour la classe {classes[pair[0]].nom}."
            )
        sessions.extend([pair] * item['weekly_sessions'])

    academic_slots = list(
        TimetableSlot.objects.filter(academic_year=academic_year).select_related(
            'classe',
            'professeur',
        )
    )
    class_subject_days = defaultdict(set)
    for slot in academic_slots:
        class_subject_days[(slot.classe_id, slot.matiere_id)].add(slot.day_of_week)
    teacher_load = defaultdict(int)
    class_day_load = defaultdict(int)
    teacher_day_load = defaultdict(int)
    for slot in academic_slots:
        duration = _minutes(slot.end_hour) - _minutes(slot.start_hour)
        class_day_load[(slot.classe_id, slot.day_of_week)] += duration
        if slot.professeur_id:
            teacher_load[slot.professeur_id] += duration
            teacher_day_load[(slot.professeur_id, slot.day_of_week)] += duration

    sessions.sort(
        key=lambda pair: (
            len(teacher_options[pair]),
            -sum(
                1
                for slot in academic_slots
                if slot.classe_id == pair[0] or slot.matiere_id == pair[1]
            ),
            pair[0],
            pair[1],
        )
    )
    proposed = []
    unscheduled = []

    for class_id, subject_id in sessions:
        choices = []
        for day in SCHOOL_DAYS:
            if day in class_subject_days[(class_id, subject_id)]:
                continue
            for start in AVAILABLE_START_MINUTES:
                end = start + LESSON_DURATION_MINUTES
                if any(
                    existing.classe_id == class_id
                    and _overlaps(day, start, end, existing)
                    for existing in academic_slots + proposed
                ):
                    continue
                for teacher in teacher_options[(class_id, subject_id)]:
                    if any(
                        slot.day_of_week == day
                        and slot.professeur_id == teacher.pk
                        and start < _minutes(slot.end_hour)
                        and _minutes(slot.start_hour) < end
                        for slot in academic_slots + proposed
                    ):
                        continue
                    choices.append((
                        class_day_load[(class_id, day)],
                        teacher_day_load[(teacher.pk, day)],
                        teacher_load[teacher.pk],
                        day,
                        start,
                        teacher.pk,
                        teacher,
                    ))
        if not choices:
            unscheduled.append({
                'class_id': class_id,
                'subject_id': subject_id,
            })
            continue

        _, _, _, day, start, teacher_id, teacher = min(choices)
        proposed_slot = TimetableSlot(
            classe=classes[class_id],
            matiere_id=subject_id,
            professeur=teacher,
            day_of_week=day,
            start_hour=_time(start),
            end_hour=_time(start + LESSON_DURATION_MINUTES),
            room='',
            academic_year=academic_year,
        )
        proposed.append(proposed_slot)
        class_subject_days[(class_id, subject_id)].add(day)
        teacher_load[teacher_id] += LESSON_DURATION_MINUTES
        class_day_load[(class_id, day)] += LESSON_DURATION_MINUTES
        teacher_day_load[(teacher_id, day)] += LESSON_DURATION_MINUTES

    if unscheduled:
        raise ValueError({
            'detail': 'Impossible de placer tous les cours avec les disponibilités configurées.',
            'unscheduled': unscheduled,
        })

    return [
        {
            'classe': slot.classe_id,
            'matiere': slot.matiere_id,
            'professeur': slot.professeur_id,
            'day_of_week': slot.day_of_week,
            'start_hour': slot.start_hour.strftime('%H:%M'),
            'end_hour': slot.end_hour.strftime('%H:%M'),
            'room': slot.room,
            'academic_year': slot.academic_year,
        }
        for slot in proposed
    ]


def find_plan_conflict(candidate, scheduled):
    for other in scheduled:
        if (
            candidate.day_of_week != other.day_of_week
            or candidate.academic_year != other.academic_year
            or candidate.start_hour >= other.end_hour
            or candidate.end_hour <= other.start_hour
        ):
            continue
        same_class = candidate.classe_id == other.classe_id
        same_teacher = (
            candidate.professeur_id
            and candidate.professeur_id == other.professeur_id
        )
        same_room = (
            candidate.room.strip()
            and candidate.room.strip().casefold() == other.room.strip().casefold()
        )
        if same_class or same_teacher or same_room:
            return 'classe' if same_class else 'professeur' if same_teacher else 'salle'
    return None
