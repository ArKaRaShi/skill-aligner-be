-- CreateTable
CREATE TABLE "public"."QuestionLog" (
    "id" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "role" TEXT,
    "mention_roles" TEXT[],
    "mention_skills" TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseClickLog" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseClickLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseClickLog_question_id_course_id_key" ON "public"."CourseClickLog"("question_id", "course_id");

-- AddForeignKey
ALTER TABLE "public"."CourseClickLog" ADD CONSTRAINT "CourseClickLog_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseClickLog" ADD CONSTRAINT "CourseClickLog_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."QuestionLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
