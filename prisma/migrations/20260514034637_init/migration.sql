-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KnowledgePointType" AS ENUM ('STEM', 'VOCABULARY', 'CONCEPT');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'MATCHING', 'FILL_BLANK', 'TRUE_FALSE', 'STEM_BUILDING');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'MASTERED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "grade" TEXT,
    "classroom" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseUnit" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "unitId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePoint" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" "KnowledgePointType" NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "meaning" TEXT,
    "examples" JSONB,
    "sourceOrder" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "word" TEXT NOT NULL,
    "ipa" TEXT,
    "partOfSpeech" TEXT,
    "definition" TEXT NOT NULL,
    "category" TEXT,
    "sourceOrder" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "knowledgePointId" TEXT,
    "type" "ExerciseType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "group" TEXT,
    "order" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLevel" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "indices" JSONB,
    "timeLimitSeconds" INTEGER NOT NULL DEFAULT 0,
    "isBoss" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "knowledgePointId" TEXT,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "exerciseId" TEXT,
    "knowledgePointId" TEXT,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpentMs" INTEGER,
    "gameMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MistakeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "exerciseId" TEXT,
    "knowledgePointId" TEXT,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "correctAfterWrongCount" INTEGER NOT NULL DEFAULT 0,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MistakeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedMaterial" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContentJob" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "materialId" TEXT,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedContentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "CourseUnit_courseId_order_idx" ON "CourseUnit"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CourseUnit_courseId_slug_key" ON "CourseUnit"("courseId", "slug");

-- CreateIndex
CREATE INDEX "Lesson_courseId_order_idx" ON "Lesson"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_courseId_slug_key" ON "Lesson"("courseId", "slug");

-- CreateIndex
CREATE INDEX "KnowledgePoint_courseId_type_idx" ON "KnowledgePoint"("courseId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePoint_courseId_type_key_key" ON "KnowledgePoint"("courseId", "type", "key");

-- CreateIndex
CREATE INDEX "VocabularyItem_courseId_lessonId_idx" ON "VocabularyItem"("courseId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyItem_courseId_word_key" ON "VocabularyItem"("courseId", "word");

-- CreateIndex
CREATE INDEX "Exercise_courseId_lessonId_order_idx" ON "Exercise"("courseId", "lessonId", "order");

-- CreateIndex
CREATE INDEX "Exercise_courseId_type_idx" ON "Exercise"("courseId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "GameLevel_courseId_order_key" ON "GameLevel"("courseId", "order");

-- CreateIndex
CREATE INDEX "LearningProgress_userId_courseId_idx" ON "LearningProgress"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_userId_courseId_lessonId_knowledgePointId_key" ON "LearningProgress"("userId", "courseId", "lessonId", "knowledgePointId");

-- CreateIndex
CREATE INDEX "AnswerAttempt_userId_courseId_createdAt_idx" ON "AnswerAttempt"("userId", "courseId", "createdAt");

-- CreateIndex
CREATE INDEX "AnswerAttempt_exerciseId_idx" ON "AnswerAttempt"("exerciseId");

-- CreateIndex
CREATE INDEX "MistakeRecord_userId_courseId_mastered_idx" ON "MistakeRecord"("userId", "courseId", "mastered");

-- CreateIndex
CREATE UNIQUE INDEX "MistakeRecord_userId_courseId_exerciseId_knowledgePointId_key" ON "MistakeRecord"("userId", "courseId", "exerciseId", "knowledgePointId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseUnit" ADD CONSTRAINT "CourseUnit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "CourseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLevel" ADD CONSTRAINT "GameLevel_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerAttempt" ADD CONSTRAINT "AnswerAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerAttempt" ADD CONSTRAINT "AnswerAttempt_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerAttempt" ADD CONSTRAINT "AnswerAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerAttempt" ADD CONSTRAINT "AnswerAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerAttempt" ADD CONSTRAINT "AnswerAttempt_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeRecord" ADD CONSTRAINT "MistakeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeRecord" ADD CONSTRAINT "MistakeRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeRecord" ADD CONSTRAINT "MistakeRecord_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeRecord" ADD CONSTRAINT "MistakeRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeRecord" ADD CONSTRAINT "MistakeRecord_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedMaterial" ADD CONSTRAINT "UploadedMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContentJob" ADD CONSTRAINT "GeneratedContentJob_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContentJob" ADD CONSTRAINT "GeneratedContentJob_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "UploadedMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
