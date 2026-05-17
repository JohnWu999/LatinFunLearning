import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  name: z.string().min(1, "请输入昵称").max(80, "昵称不能超过 80 个字符"),
  password: z.string().min(6, "密码至少需要 6 位").max(128, "密码不能超过 128 位")
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
