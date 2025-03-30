import mongoose from "mongoose";
import { z } from "zod";

// === USERS SCHEMA ===
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: false
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    unique: false,
  }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

// Zod schema for inserting users
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username cannot be empty"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserType = mongoose.Document & {
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

// === MESSAGES SCHEMA ===
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  }
}, { timestamps: true });

export const Message = mongoose.model('Message', messageSchema);

// Zod schema for inserting messages
export const insertMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Content cannot be empty"),
  sessionId: z.string().min(1, "Session ID cannot be empty")
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageType = mongoose.Document & {
  role: "user" | "assistant";
  content: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
};

// === CHAT SESSION SCHEMA ===
export const chatSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID cannot be empty"),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1, "Message content cannot be empty")
  }))
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

// === STORY REQUEST SCHEMA ===
export const storyRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  sessionId: z.string().min(1, "Session ID cannot be empty")
});

export type StoryRequest = z.infer<typeof storyRequestSchema>;
