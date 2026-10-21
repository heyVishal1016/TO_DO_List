import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  isAdmin: z.boolean().optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const priorityEnum = z
  .enum(['low', 'medium', 'high', 'med'])
  .transform((val) => (val === 'med' ? 'medium' : val));

export const createTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  priority: priorityEnum.default('medium'),
  completed: z
    .union([z.boolean(), z.number()])
    .transform((v) => (v ? 1 : 0))
    .optional()
});

export const updateTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  priority: priorityEnum.optional(),
  completed: z
    .union([z.boolean(), z.number()])
    .transform((v) => (v ? 1 : 0))
    .optional()
});

// Restore item accepts both camelCase and snake_case for flexibility
export const restoreItemSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: priorityEnum.default('medium'),
  completed: z
    .union([z.boolean(), z.number()])
    .transform((v) => (v ? 1 : 0))
    .default(0),
  created_at: z.string().optional()
});

export const restoreSchema = z.object({
  todos: z.array(restoreItemSchema).min(1, 'At least one task must be provided in the todos array')
});

// Aliases for backwards compatibility
export const todoCreateSchema = createTodoSchema;
export const todoUpdateSchema = updateTodoSchema;
