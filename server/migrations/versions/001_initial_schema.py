"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # schools
    op.create_table(
        "schools",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("branch_name", sa.String(255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # academic_years
    op.create_table(
        "academic_years",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("label", sa.String(50), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # staff (before class_sections as class_sections references it)
    op.create_table(
        "staff",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("emp_code", sa.String(50), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("designation", sa.String(100), nullable=True),
        sa.Column("grade", sa.String(50), nullable=True),
        sa.Column("gender", sa.String(10), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("qualification", sa.String(255), nullable=True),
        sa.Column("experience_years", sa.Integer(), nullable=True),
        sa.Column("join_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # class_sections
    op.create_table(
        "class_sections",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=False),
        sa.Column("class_name", sa.String(50), nullable=False),
        sa.Column("section", sa.String(10), nullable=False),
        sa.Column("class_teacher_id", sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"]),
        sa.ForeignKeyConstraint(["class_teacher_id"], ["staff.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # students
    op.create_table(
        "students",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=False),
        sa.Column("admission_no", sa.String(50), nullable=False),
        sa.Column("reg_no", sa.String(50), nullable=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("gender", sa.String(10), nullable=False),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("blood_group", sa.String(10), nullable=True),
        sa.Column("aadhar_no", sa.String(20), nullable=True),
        sa.Column("class_section_id", sa.String(36), nullable=True),
        sa.Column("student_type", sa.String(20), nullable=True),
        sa.Column("hosteller", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("admission_type", sa.String(20), nullable=True),
        sa.Column("registration_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"]),
        sa.ForeignKeyConstraint(["class_section_id"], ["class_sections.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # teacher_subjects
    op.create_table(
        "teacher_subjects",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("staff_id", sa.String(36), nullable=False),
        sa.Column("class_section_id", sa.String(36), nullable=False),
        sa.Column("subject", sa.String(100), nullable=False),
        sa.ForeignKeyConstraint(["class_section_id"], ["class_sections.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["staff_id"], ["staff.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # enquiries
    op.create_table(
        "enquiries",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("enq_no", sa.String(30), nullable=False),
        sa.Column("student_name", sa.String(255), nullable=False),
        sa.Column("parent_name", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("class_seeking", sa.String(50), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # registrations
    op.create_table(
        "registrations",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=True),
        sa.Column("enquiry_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("student_fields", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"]),
        sa.ForeignKeyConstraint(["enquiry_id"], ["enquiries.id"]),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # parent_guardians
    op.create_table(
        "parent_guardians",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("registration_id", sa.String(36), nullable=False),
        sa.Column("relation", sa.String(30), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("occupation", sa.String(100), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["registration_id"], ["registrations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # documents
    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("entity_type", sa.String(30), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("url_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # student_attendance_records
    op.create_table(
        "student_attendance_records",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=True),
        sa.Column("class_section_id", sa.String(36), nullable=True),
        sa.Column("student_id", sa.String(36), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("period_no", sa.Integer(), nullable=True),
        sa.Column("session", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="not_marked"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("marked_by", sa.String(36), nullable=True),
        sa.Column("marked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by", sa.String(36), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("previous_status", sa.String(20), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # staff_attendance_records
    op.create_table(
        "staff_attendance_records",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("staff_id", sa.String(36), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="not_marked"),
        sa.Column("check_in_time", sa.Time(), nullable=True),
        sa.Column("check_out_time", sa.Time(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("marked_by", sa.String(36), nullable=True),
        sa.Column("marked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by", sa.String(36), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("previous_status", sa.String(20), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.ForeignKeyConstraint(["staff_id"], ["staff.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # leaves
    op.create_table(
        "leaves",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column("leave_type", sa.String(20), nullable=False),
        sa.Column("from_date", sa.Date(), nullable=False),
        sa.Column("to_date", sa.Date(), nullable=False),
        sa.Column("days", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("applied_by", sa.String(36), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_by", sa.String(36), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # homework
    op.create_table(
        "homework",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=True),
        sa.Column("class_section_id", sa.String(36), nullable=False),
        sa.Column("subject", sa.String(100), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assigned_by", sa.String(36), nullable=False),
        sa.Column("assigned_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # homework_attachments
    op.create_table(
        "homework_attachments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("homework_id", sa.String(36), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["homework_id"], ["homework.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # notices
    op.create_table(
        "notices",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("target_type", sa.String(30), nullable=False, server_default="school_wide"),
        sa.Column("target_class_section_ids", sa.JSON(), nullable=True),
        sa.Column("sent_by", sa.String(36), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # notice_attachments
    op.create_table(
        "notice_attachments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("notice_id", sa.String(36), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["notice_id"], ["notices.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # concerns
    op.create_table(
        "concerns",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("student_id", sa.String(36), nullable=False),
        sa.Column("submitted_by", sa.String(36), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("directed_to", sa.String(30), nullable=False),
        sa.Column("directed_to_staff_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("reopened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", sa.String(36), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_by", sa.String(36), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # concern_messages
    op.create_table(
        "concern_messages",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("concern_id", sa.String(36), nullable=False),
        sa.Column("sender_type", sa.String(20), nullable=False),
        sa.Column("sender_id", sa.String(36), nullable=False),
        sa.Column("sender_name", sa.String(255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["concern_id"], ["concerns.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # syllabus
    op.create_table(
        "syllabus",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=False),
        sa.Column("class_section_id", sa.String(36), nullable=False),
        sa.Column("subject", sa.String(100), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("topics", sa.JSON(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # syllabus_attachments
    op.create_table(
        "syllabus_attachments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("syllabus_id", sa.String(36), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["syllabus_id"], ["syllabus.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # newsletters
    op.create_table(
        "newsletters",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("issue_label", sa.String(100), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("published_date", sa.Date(), nullable=True),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # newsletter_attachments
    op.create_table(
        "newsletter_attachments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("newsletter_id", sa.String(36), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("s3_key", sa.String(512), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["newsletter_id"], ["newsletters.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # period_configs
    op.create_table(
        "period_configs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("periods", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by", sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # timetables
    op.create_table(
        "timetables",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=False),
        sa.Column("class_section_id", sa.String(36), nullable=False),
        sa.Column("entries", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # exams
    op.create_table(
        "exams",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("academic_year_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("exam_type", sa.String(30), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # exam_schedule_entries
    op.create_table(
        "exam_schedule_entries",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("exam_id", sa.String(36), nullable=False),
        sa.Column("class_section_id", sa.String(36), nullable=False),
        sa.Column("subject", sa.String(100), nullable=False),
        sa.Column("exam_date", sa.Date(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("max_marks", sa.Numeric(6, 2), nullable=False),
        sa.Column("passing_marks", sa.Numeric(6, 2), nullable=False, server_default="35"),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # results
    op.create_table(
        "results",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("exam_id", sa.String(36), nullable=False),
        sa.Column("student_id", sa.String(36), nullable=False),
        sa.Column("class_section_id", sa.String(36), nullable=False),
        sa.Column("subject", sa.String(100), nullable=False),
        sa.Column("marks_obtained", sa.Numeric(6, 2), nullable=True),
        sa.Column("max_marks", sa.Numeric(6, 2), nullable=False),
        sa.Column("passing_marks", sa.Numeric(6, 2), nullable=True),
        sa.Column("is_absent", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_exempt", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("grade", sa.String(10), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_by", sa.String(36), nullable=True),
        sa.Column("entered_by", sa.String(36), nullable=False),
        sa.Column("entered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("results")
    op.drop_table("exam_schedule_entries")
    op.drop_table("exams")
    op.drop_table("timetables")
    op.drop_table("period_configs")
    op.drop_table("newsletter_attachments")
    op.drop_table("newsletters")
    op.drop_table("syllabus_attachments")
    op.drop_table("syllabus")
    op.drop_table("concern_messages")
    op.drop_table("concerns")
    op.drop_table("notice_attachments")
    op.drop_table("notices")
    op.drop_table("homework_attachments")
    op.drop_table("homework")
    op.drop_table("leaves")
    op.drop_table("staff_attendance_records")
    op.drop_table("student_attendance_records")
    op.drop_table("documents")
    op.drop_table("parent_guardians")
    op.drop_table("registrations")
    op.drop_table("enquiries")
    op.drop_table("teacher_subjects")
    op.drop_table("students")
    op.drop_table("class_sections")
    op.drop_table("staff")
    op.drop_table("academic_years")
    op.drop_table("schools")
