from rest_framework import permissions


STAFF_ROLES = (
    'ADMIN',
    'PROFESSEUR',
    'SURVEILLANT',
    'SECRETARIAT',
)


class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in STAFF_ROLES
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
            and request.user.role in STAFF_ROLES
        ):
            return False
        return request.method in permissions.SAFE_METHODS or request.user.role == 'ADMIN'


class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'PROFESSEUR')
        )


class IsSurveillantOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'SURVEILLANT')
        )


class IsTeacherOrSurveillantOrAdmin(permissions.BasePermission):
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
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        return request.user.role == 'PROFESSEUR'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'PROFESSEUR':
            if request.method in permissions.SAFE_METHODS:
                return True
            from classes.models import TeacherAssignment
            return TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=obj.etudiant.classe,
                matiere=obj.matiere,
                academic_year=obj.exam_period.academic_year if obj.exam_period else None
            ).exists()
        return False


class CanViewSchedule(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in STAFF_ROLES
        )


class CanManageAttendance(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role in ('SURVEILLANT', 'SECRETARIAT'):
            return request.method in permissions.SAFE_METHODS
        return request.user.role == 'PROFESSEUR'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role in ('SURVEILLANT', 'SECRETARIAT'):
            return request.method in permissions.SAFE_METHODS
        if request.user.role == 'PROFESSEUR':
            if request.method in permissions.SAFE_METHODS:
                return True
            from classes.models import TeacherAssignment
            return TeacherAssignment.objects.filter(
                professeur=request.user,
                classe=obj.etudiant.classe
            ).exists()
        return False


class CanManageStudents(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'SECRETARIAT':
            return request.method in permissions.SAFE_METHODS or request.method in ('POST', 'PUT', 'PATCH')
        if request.user.role in ('PROFESSEUR', 'SURVEILLANT'):
            return request.method in permissions.SAFE_METHODS
        return False


class CanManageEnrollment(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'SECRETARIAT':
            return request.method in permissions.SAFE_METHODS or request.method == 'POST'
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in ('PROFESSEUR', 'SURVEILLANT')
        return False


class CanManageOfficePass(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.role in STAFF_ROLES):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.role in ('ADMIN', 'SURVEILLANT', 'SECRETARIAT')


class CanParticipateInChat(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in STAFF_ROLES
        )


class CanViewReports(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'PROFESSEUR', 'SURVEILLANT')
        )
