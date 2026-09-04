from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'


class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


class IsTeacherOrAdmin(permissions.BasePermission):
    """Allow teachers and admins."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'PROFESSEUR')
        )


class IsSurveillantOrAdmin(permissions.BasePermission):
    """Allow surveillants and admins."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'SURVEILLANT')
        )


class IsTeacherOrSurveillantOrAdmin(permissions.BasePermission):
    """Allow teachers, surveillants, and admins."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'PROFESSEUR', 'SURVEILLANT')
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        owner = getattr(obj, 'user', None) or getattr(obj, 'sender', None) or getattr(obj, 'professeur', None) or obj
        return owner == request.user


class CanManageGrades(permissions.BasePermission):
    """
    Teachers can only manage grades for their assigned classes/subjects.
    Admins can manage all grades.
    Surveillants can only view grades (read-only).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'SURVEILLANT':
            # Surveillants can only read
            return request.method in permissions.SAFE_METHODS
        if request.user.role == 'PROFESSEUR':
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'SURVEILLANT':
            return request.method in permissions.SAFE_METHODS
        if request.user.role == 'PROFESSEUR':
            # Teacher can only manage grades for their assigned classes/subjects
            if request.method in permissions.SAFE_METHODS:
                return True
            # Check if teacher is assigned to this class/subject
            from classes.models import TeacherAssignment
            return TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=obj.etudiant.classe,
                matiere=obj.matiere,
                academic_year=obj.exam_period.academic_year if obj.exam_period else None
            ).exists()
        return False


class CanViewSchedule(permissions.BasePermission):
    """
    Teachers can see all schedules (for coordination).
    Surveillants can see schedules.
    Admins can see all.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ('ADMIN', 'PROFESSEUR', 'SURVEILLANT')


class CanManageAttendance(permissions.BasePermission):
    """
    Teachers can manage attendance for their classes.
    Surveillants can view attendance (read-only).
    Admins can manage all.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'SURVEILLANT':
            return request.method in permissions.SAFE_METHODS
        if request.user.role == 'PROFESSEUR':
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'SURVEILLANT':
            return request.method in permissions.SAFE_METHODS
        if request.user.role == 'PROFESSEUR':
            if request.method in permissions.SAFE_METHODS:
                return True
            # Teacher can only manage attendance for their classes
            from classes.models import TeacherAssignment
            return TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=obj.etudiant.classe
            ).exists()
        return False


class CanManageEnrollment(permissions.BasePermission):
    """
    Only admins can manage enrollments (create, update, delete).
    Teachers and surveillants can view enrollments for their classes.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in ('PROFESSEUR', 'SURVEILLANT')
        return False


class CanParticipateInChat(permissions.BasePermission):
    """
    Teachers, surveillants, and admins can participate in chat.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ('ADMIN', 'PROFESSEUR', 'SURVEILLANT')


class CanViewReports(permissions.BasePermission):
    """
    Admins can view all reports.
    Teachers can view reports for their classes.
    Surveillants can view general reports.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ('ADMIN', 'PROFESSEUR', 'SURVEILLANT')