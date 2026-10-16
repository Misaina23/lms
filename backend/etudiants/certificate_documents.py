from io import BytesIO
from xml.sax.saxutils import escape

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from classes.models import SchoolConfig
from .models import CertificateRequest


def generate_school_certificate(certificate):
    if certificate.status != CertificateRequest.Status.APPROVED:
        raise ValueError('Le certificat doit être approuvé avant de pouvoir être téléchargé.')

    student = certificate.student
    classe = student.classe
    if classe is None:
        raise ValueError('L’élève n’a pas de classe enregistrée.')
    if classe.academic_year and classe.academic_year != certificate.academic_year:
        raise ValueError('La classe actuelle ne correspond pas à l’année du certificat.')

    enrollment = student.enrollments.filter(
        academic_year=certificate.academic_year,
        classe=classe,
    ).first()
    if enrollment is None:
        raise ValueError('Aucune inscription correspondante n’est disponible pour ce certificat.')

    school_config = SchoolConfig.objects.filter(
        academic_year=certificate.academic_year,
    ).first() or SchoolConfig.objects.filter(active=True).first()
    school_name = school_config.school_name if school_config else 'Lycée Midongy Sud'
    school_address = school_config.school_address if school_config else ''
    school_phone = school_config.school_phone if school_config else ''
    issue_date = timezone.localdate()
    certificate_number = f"CERT-{certificate.academic_year.replace('-', '')}-{certificate.pk:06d}"

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.2 * cm,
        leftMargin=2.2 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title=f'Certificat de scolarité - {student.get_full_name()}',
        author=school_name,
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='SchoolHeader',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#163b36'),
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name='CertificateTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=19,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#163b36'),
        spaceBefore=26,
        spaceAfter=24,
    ))
    styles.add(ParagraphStyle(
        name='CertificateBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=12,
        leading=20,
        alignment=TA_JUSTIFY,
        spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        name='CertificateMeta',
        parent=styles['BodyText'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#52616b'),
    ))

    story = [
        Paragraph(escape(school_name), styles['SchoolHeader']),
    ]
    header_details = ' · '.join(value for value in (school_address, school_phone) if value)
    if header_details:
        story.append(Paragraph(escape(header_details), styles['CertificateMeta']))
    story.extend([
        Spacer(1, 0.35 * cm),
        HRFlowable(width='100%', thickness=1.2, color=colors.HexColor('#163b36')),
        Paragraph('CERTIFICAT DE SCOLARITÉ', styles['CertificateTitle']),
        Paragraph(
            'Le chef de l’établissement certifie que l’élève ci-dessous est régulièrement '
            'inscrit(e) dans notre établissement pour l’année scolaire indiquée :',
            styles['CertificateBody'],
        ),
    ])

    details = [
        [Paragraph('<b>Nom et prénom</b>', styles['BodyText']), escape(student.get_full_name())],
        [Paragraph('<b>Matricule</b>', styles['BodyText']), escape(student.matricule)],
        [Paragraph('<b>Classe</b>', styles['BodyText']), escape(classe.nom)],
        [Paragraph('<b>Année scolaire</b>', styles['BodyText']), escape(certificate.academic_year)],
    ]
    table = Table(details, colWidths=[5 * cm, 10.5 * cm], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eef4f2')),
        ('BOX', (0, 0), (-1, -1), 0.7, colors.HexColor('#aabbb5')),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cbd5d1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
    ]))
    story.extend([
        table,
        Spacer(1, 0.7 * cm),
        Paragraph(
            'Le présent certificat est délivré à l’intéressé(e) pour servir et valoir ce que de droit.',
            styles['CertificateBody'],
        ),
        Spacer(1, 0.4 * cm),
        Paragraph(
            f"Fait à Midongy Sud, le {issue_date.strftime('%d/%m/%Y')}.",
            ParagraphStyle(
                name='IssueDate',
                parent=styles['BodyText'],
                alignment=TA_CENTER,
                fontSize=11,
            ),
        ),
        Spacer(1, 1.2 * cm),
    ])
    signer = certificate.decided_by.get_full_name() if certificate.decided_by else 'Administration'
    signature = Table([
        ['', Paragraph(
            f'<b>Le chef de l’établissement</b><br/><br/><br/>{escape(signer)}',
            ParagraphStyle(name='Signature', parent=styles['BodyText'], alignment=TA_CENTER),
        )],
    ], colWidths=[7.75 * cm, 7.75 * cm])
    signature.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEABOVE', (1, 0), (1, 0), 0.7, colors.HexColor('#52616b')),
        ('TOPPADDING', (1, 0), (1, 0), 10),
    ]))
    story.extend([
        signature,
        Spacer(1, 1.2 * cm),
        HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#cbd5d1')),
        Paragraph(
            f'Référence : {certificate_number}',
            ParagraphStyle(name='Reference', parent=styles['CertificateMeta'], alignment=TA_CENTER),
        ),
    ])
    document.build(story)
    buffer.seek(0)
    return buffer, certificate_number
