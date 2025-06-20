import mongoose from "mongoose";
import { z } from "zod";

// === USERS SCHEMA ===
const userSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
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
  },
  preferences: {
    type: Object,
    required: false,
    default: {
      parents_interest: [
        {
          id: 1,
          name: "Economics"
        },
        {
          id: 2,
          name: "Rocket"
        },
        {
          id: 3,
          name: "Football"
        },
        {
          id: 4,
          name: "Blockchain"
        }
      ],
      children_interest: [
        {
          id: 1,
          name: "Princess"
        },
        {
          id: 2,
          name: "Dragon"
        },
        {
          id: 3,
          name: "Space Explorer"
        },
        {
          id: 4,
          name: "Pirate"
        },
        {
          id: 5,
          name: "Fairy"
        },
        {
          id: 6,
          name: "Robot"
        }
      ],
      themes: [
        {
          id: 1,
          name: "Suspense"
        },
        {
          id: 2,
          name: "Comedy"
        },
        {
          id: 3,
          name: "Horror"
        },
        {
          id: 4,
          name: "Adventure"
        },
      ],
      parents_name: [],
      children_name: [],
    }
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
  },
  userId: {
    type: Number,
    required: true,
    ref: "User",
  },
}, { timestamps: true });

export const Message = mongoose.model('Message', messageSchema);

// === STORIES SCHEMA ===
const storySchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    ref: "User",
  },
  title: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    required: true
  }
}, { timestamps: true });

export const Stories = mongoose.model('Stories', storySchema);
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
  userId: number;
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
  sessionId: z.string().min(1, "Session ID cannot be empty"),
  userId: z.number().min(1, "User ID must be a positive number"),
});

// === FEEDBACK SCHEMA ===

const feedbackSchema = new mongoose.Schema({
  feedbackCode: {
    type: Number,
    required: false,
  },
  comment: {
    type: String,
    required: false,
  },
  userId: {
    type: Number,
    required: true,
    ref: "User",
  },
  storyPrompt: {
    type: String,
    required: false,
  }
}, { timestamps: true });

export const Feedback = mongoose.model('Feedback', feedbackSchema);

export const feedbackRequestSchema = z.object({
  feedbackCode: z.number().min(1, "Feedback code must be a positive number").optional(),
  comment: z.string().optional(),
  userId: z.number().min(1, "User ID must be a positive number").optional(),
  storyPrompt: z.string().min(1, "Story prompt cannot be empty").optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
export type StoryRequest = z.infer<typeof storyRequestSchema>;