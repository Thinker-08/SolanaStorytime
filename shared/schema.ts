import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  sessionId: text("sessionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  role: true,
  content: true,
  sessionId: true
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const chatSessionSchema = z.object({
  sessionId: z.string(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  }))
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

export const storyRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  sessionId: z.string()
});

export type StoryRequest = z.infer<typeof storyRequestSchema>;
