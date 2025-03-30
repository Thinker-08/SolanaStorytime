import mongoose, { Document } from 'mongoose';
import { User, Message } from '../shared/schema';  // Import your Mongoose models

// Define types for User and Message documents
export interface IUser extends Document {
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  role: "user" | "assistant";
  content: string;
  sessionId: string;
  createdAt: Date;   // Add timestamps
  updatedAt: Date;    // Add timestamps
}

export class MemStorage {
  constructor() {
    this.init();
  }

  async init() {
    try {
      const URI = process.env.MONGODB_URI;
      if (!URI) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      await mongoose.connect(URI);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUser(id: string): Promise<IUser | null> {
    return User.findById(id).exec();
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username }).exec();
  }

  // Create a new user
  async createUser(user: { username: string; password: string }): Promise<IUser> {
    const newUser = new User(user);
    return newUser.save();
  }

  // Save a message
  async saveMessage(message: { role: "user" | "assistant"; content: string; sessionId: string }): Promise<IMessage> {
    const newMessage = new Message(message);
    return newMessage.save();
  }

  // Get all messages by sessionId
  async getMessagesBySessionId(sessionId: string): Promise<IMessage[]> {
    return Message.find({ sessionId }).exec();
  }
}

export const storage = new MemStorage();
