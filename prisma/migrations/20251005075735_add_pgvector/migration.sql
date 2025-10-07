CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" UUID NOT NULL,
    "campus_code" TEXT NOT NULL,
    "faculty_code" TEXT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "subject_code" TEXT NOT NULL,
    "subject_name_th" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_learning_outcomes" (
    "id" UUID NOT NULL,
    "clo_no" TEXT NOT NULL,
    "clo_name_th" TEXT NOT NULL,
    "course_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" VECTOR(768) NOT NULL,
    CONSTRAINT "course_learning_outcomes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."course_learning_outcomes" ADD CONSTRAINT "course_learning_outcomes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
