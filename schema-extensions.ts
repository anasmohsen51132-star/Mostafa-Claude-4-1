// ================================================================
// PRISMA SCHEMA EXTENSIONS — v2
// These models EXTEND the existing schema (schema.prisma).
// In production, apply via: prisma migrate dev --name "add_homework_images"
// ================================================================

// NOTE: The following models must be added to schema.prisma
// They are listed here as a migration reference document.
// Run the migration script to apply them: scripts/migrate-extend.sh

/*
─────────────────────────────────────────────────────
ADD TO schema.prisma — Question model extension:
─────────────────────────────────────────────────────

In the existing Question model, add these nullable fields:
  imageUrl        String?
  imageCaption    String?
  images          QuestionImage[]

─────────────────────────────────────────────────────
NEW MODELS TO APPEND TO schema.prisma:
─────────────────────────────────────────────────────

model QuestionImage {
  id          String   @id @default(cuid())
  questionId  String
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  url         String
  key         String   // S3 key
  caption     String?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([questionId])
  @@map("question_images")
}

enum HomeworkStatus {
  DRAFT
  PUBLISHED
  CLOSED
}

enum SubmissionStatus {
  SUBMITTED
  GRADED
  RETURNED
  LATE
}

model Homework {
  id          String         @id @default(cuid())
  courseId    String
  course      Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lectureId   String?
  title       String
  description String
  instructions String?
  dueDate     DateTime?
  maxScore    Int            @default(100)
  status      HomeworkStatus @default(DRAFT)
  allowLate   Boolean        @default(false)
  imageUrl    String?
  attachments Json?
  createdBy   String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  questions    HomeworkQuestion[]
  submissions  HomeworkSubmission[]

  @@index([courseId])
  @@index([status])
  @@map("homework")
}

model HomeworkQuestion {
  id           String   @id @default(cuid())
  homeworkId   String
  homework     Homework @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  text         String
  type         String   @default("essay")
  options      Json?
  correctAnswer String?
  explanation  String?
  points       Int      @default(1)
  sortOrder    Int      @default(0)
  imageUrl     String?
  imageCaption String?
  images       HomeworkQuestionImage[]
  createdAt    DateTime @default(now())

  answers      HomeworkAnswer[]

  @@index([homeworkId])
  @@map("homework_questions")
}

model HomeworkQuestionImage {
  id          String           @id @default(cuid())
  questionId  String
  question    HomeworkQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  url         String
  key         String
  caption     String?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([questionId])
  @@map("homework_question_images")
}

model HomeworkSubmission {
  id           String           @id @default(cuid())
  homeworkId   String
  homework     Homework         @relation(fields: [homeworkId], references: [id])
  userId       String
  user         User             @relation(fields: [userId], references: [id])
  status       SubmissionStatus @default(SUBMITTED)
  score        Int?
  maxScore     Int?
  feedback     String?
  isLate       Boolean          @default(false)
  submittedAt  DateTime         @default(now())
  gradedAt     DateTime?
  gradedBy     String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  answers      HomeworkAnswer[]
  attachments  SubmissionAttachment[]

  @@unique([homeworkId, userId])
  @@index([homeworkId])
  @@index([userId])
  @@index([status])
  @@map("homework_submissions")
}

model HomeworkAnswer {
  id           String             @id @default(cuid())
  submissionId String
  submission   HomeworkSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  questionId   String
  question     HomeworkQuestion   @relation(fields: [questionId], references: [id])
  answer       String?
  isCorrect    Boolean?
  points       Int?
  feedback     String?
  imageUrls    Json?
  createdAt    DateTime           @default(now())

  @@index([submissionId])
  @@map("homework_answers")
}

model SubmissionAttachment {
  id           String             @id @default(cuid())
  submissionId String
  submission   HomeworkSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  url          String
  key          String
  filename     String
  mimeType     String
  size         BigInt
  createdAt    DateTime           @default(now())

  @@index([submissionId])
  @@map("submission_attachments")
}
*/

export const SCHEMA_EXTENSION_VERSION = '2.0.0';
export const SCHEMA_EXTENSION_MODELS = [
  'QuestionImage',
  'Homework',
  'HomeworkQuestion',
  'HomeworkQuestionImage',
  'HomeworkSubmission',
  'HomeworkAnswer',
  'SubmissionAttachment',
];
