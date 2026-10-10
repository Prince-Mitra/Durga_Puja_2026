const { z } = require('zod');

// Strings only: this is what stops {"username": {"$gt": ""}} style NoSQL injection at the door.
const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).max(254).optional(),
    username: z.string().trim().min(1).max(254).optional(),
    email: z.string().trim().min(1).max(254).optional(),
    password: z.string().min(1).max(200),
  })
  .refine((v) => v.identifier || v.username || v.email, { message: 'Username or email is required' });

const playerSessionSchema = z.object({
  token: z.string().max(2000).optional(),
  nickname: z.string().max(60).optional(),
});

module.exports = { loginSchema, playerSessionSchema };
