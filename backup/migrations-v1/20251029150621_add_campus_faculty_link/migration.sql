-- CreateTable
CREATE TABLE "public"."campus_faculties" (
    "id" UUID NOT NULL,
    "campus_id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_faculties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campus_faculties_campus_id_faculty_id_key" ON "public"."campus_faculties"("campus_id", "faculty_id");

-- AddForeignKey
ALTER TABLE "public"."campus_faculties" ADD CONSTRAINT "campus_faculties_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campus_faculties" ADD CONSTRAINT "campus_faculties_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
