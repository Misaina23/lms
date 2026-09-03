from django.db import models
from users.models import CustomUser
from classes.models import Classe
import uuid


class Etudiant(models.Model):
    class StudentStatus(models.TextChoices):
        APPLICANT = 'APPLICANT', 'Candidat'
        ENROLLED = 'ENROLLED', 'Inscrit'
        SUSPENDED = 'SUSPENDED', 'Suspendu'
        GRADUATED = 'GRADUATED', 'Diplômé'

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': CustomUser.Role.ELEVE},
    )
    classe = models.ForeignKey(Classe, on_delete=models.SET_NULL, null=True)
    date_inscription = models.DateField()
    statut = models.CharField(
        max_length=20,
        choices=StudentStatus.choices,
        default=StudentStatus.ENROLLED,
    )
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return self.user.get_full_name()

    class Meta:
        ordering = ['user__last_name', 'user__first_name']


class Enrollment(models.Model):
    """Track student enrollment and payment status."""
    class PaymentStatus(models.TextChoices):
        PAID = 'PAID', 'Payé'
        PARTIAL = 'PARTIAL', 'Partiel'
        UNPAID = 'UNPAID', 'Non payé'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Etudiant,
        on_delete=models.CASCADE,
        related_name='enrollments',
    )
    classe = models.ForeignKey(Classe, on_delete=models.SET_NULL, null=True)
    academic_year = models.CharField(max_length=9, help_text="Format: YYYY-YYYY (ex: 2024-2025)")
    receipt_number = models.CharField(max_length=100, unique=True, blank=True)
    payment_status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
    )
    frais_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Frais total d'inscription",
    )
    frais_verses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Montant versé",
    )
    devise = models.CharField(
        max_length=3,
        default='XOF',
        help_text="Devise des paiements",
    )
    receipt_file = models.FileField(
        upload_to='receipts/',
        null=True,
        blank=True,
        help_text="Fichier PDF du reçu de paiement",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year', 'student']
        unique_together = ['student', 'academic_year']

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import uuid as uuid_lib
            self.receipt_number = f"REC-{uuid_lib.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} - {self.academic_year} ({self.get_payment_status_display()})"


class StudentOrientation(models.Model):
    """AI-driven orientation recommendation for end-of-Seconde students."""
    class Stream(models.TextChoices):
        SCIENTIFIQUE = 'S', 'Scientifique (1ère S)'
        LITTERAIRE = 'L', 'Littéraire (1ère L)'
        SOCIO_ECONOMIQUE = 'OSE', 'Socio-Économique (1ère OSE)'

    class Status(models.TextChoices):
        PROPOSED = 'PROPOSED', 'Proposé'
        CONFIRMED = 'CONFIRMED', 'Confirmé'
        REJECTED = 'REJECTED', 'Rejeté'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Etudiant,
        on_delete=models.CASCADE,
        related_name='orientations',
    )
    recommended_stream = models.CharField(max_length=5, choices=Stream.choices)
    ai_confidence_score = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage score (0-100)")
    ai_explanation = models.TextField(blank=True, help_text="Human-readable explanation of the recommendation")
    ai_model_version = models.CharField(max_length=50, help_text="Version of the AI model used for this prediction")
    final_stream = models.CharField(max_length=5, choices=Stream.choices, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROPOSED)
    decided_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orientations_decided',
        help_text="Admin who confirmed/rejected the recommendation",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', 'student']

    def __str__(self):
        return f"{self.student} → {self.get_recommended_stream_display()} ({self.ai_confidence_score}%)"


class AuditLog(models.Model):
    """Journal d'audit pour tracer toutes les actions sensibles."""
    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Création'
        UPDATE = 'UPDATE', 'Modification'
        DELETE = 'DELETE', 'Suppression'
        STATUS_CHANGE = 'STATUS_CHANGE', 'Changement de statut'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
    )
    entity_type = models.CharField(max_length=50, help_text="Type d'entité (Grade, Enrollment, Attendance, etc.)")
    entity_id = models.CharField(max_length=100, help_text="ID of the affected entity")
    action = models.CharField(max_length=20, choices=Action.choices)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True, help_text="Justification for the action (e.g., correction)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_action_display()} - {self.entity_type}#{self.entity_id} - {self.created_at}"


class Notification(models.Model):
    """Multi-channel notification system (Push, SMS, Email)."""
    class Channel(models.TextChoices):
        PUSH = 'PUSH', 'Push notification'
        SMS = 'SMS', 'SMS'
        EMAIL = 'EMAIL', 'Email'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'En attente'
        SENT = 'SENT', 'Envoyé'
        FAILED = 'FAILED', 'Échec'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    channel = models.CharField(max_length=10, choices=Channel.choices)
    notification_type = models.CharField(max_length=50, help_text="Type de notification (ABSENCE, NOTE, PAYMENT, etc.)")
    title = models.CharField(max_length=200)
    message = models.TextField()
    payload = models.JSONField(blank=True, help_text="Additional data for the notification")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_channel_display()} - {self.title} - {self.get_status_display()}"
