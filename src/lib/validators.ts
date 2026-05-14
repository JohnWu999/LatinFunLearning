import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const profileSchema = z.object({
  displayName: z.string().max(80).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  grade: z.string().max(40).optional().nullable(),
  classroom: z.string().max(80).optional().nullable(),
  bio: z.string().max(500).optional().nullable()
});

export const attemptSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1).optional().nullable(),
  exerciseId: z.string().min(1).optional().nullable(),
  knowledgePointId: z.string().min(1).optional().nullable(),
  answer: z.unknown(),
  isCorrect: z.boolean(),
  timeSpentMs: z.number().int().positive().optional().nullable(),
  gameMode: z.string().max(80).optional().nullable()
});
