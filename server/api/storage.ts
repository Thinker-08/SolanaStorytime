import mongoose, { Document } from 'mongoose';
import { User, Message, Stories, Feedback } from '../../shared/schema.js';
import dotenv from 'dotenv';
dotenv.config();
// Define types for User and Message documents
export interface IUser extends Document {
  username: string;
  password: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  role: "user" | "assistant";
  content: string;
  sessionId: string;
  userId: number;
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
    return User.findById(id).lean<IUser>().exec();
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username }).lean<IUser>().exec();
  }

// Create a new user with auto-incremented ID
async createUser(user: {
  username: string;
  password: string;
  email: string;
  phone: string;
}): Promise<IUser> {
  try {
    const latestUser = await User.findOne().sort({ id: -1 });
    const newId = latestUser ? latestUser.id + 1 : 1;
    const newUser = new User({
      id: newId,         
      ...user,            
    });

    // Save the user
    return newUser.save();
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}


  // Save a message
  async saveMessage(message:
    { role: "user" | "assistant";
      content: string;
      sessionId: string;
      userId: number;
    }): Promise<IMessage> {
    const newMessage = new Message(message);
    return newMessage.save();
  }

  // Get all messages by sessionId
  async getMessagesBySessionId(sessionId: string): Promise<IMessage[]> {
    return Message.find({ sessionId }).lean<IMessage[]>().exec();
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).lean<IUser>().exec();
  }

  async getChatHistory(userId: number, page: number, perPage: number): Promise<any[]> {
    const skip = (page - 1) * perPage;
  
    const history = await Message.aggregate([
      {
        $match: {
          userId: Number(userId),
          sessionId: { $ne: "1" }, // exclude sessionId === 1
        },
      },
      {
        $group: {
          _id: "$sessionId",
          userId: { $first: "$userId" },
          sessionId: { $first: "$sessionId" },
          messages: {
            $push: {
              _id: "$_id",
              role: "$role",
              content: "$content",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
            },
          },
          messageCount: { $sum: 1 }, // count messages per session
          latestMessageTime: { $max: "$createdAt" },
        },
      },
      {
        $match: {
          messageCount: { $gt: 1 }, // exclude sessions with only 1 message
        },
      },
      { $sort: { latestMessageTime: -1 } },
      { $skip: skip },
      { $limit: perPage },
    ]);
  
    return history;
  }
  
  async getChatHistoryCount(userId: number): Promise<number> {
    const result = await Message.aggregate([
      {
        $match: {
          userId: Number(userId),
          sessionId: { $ne: "1" }, // Exclude sessionId === 1
        },
      },
      {
        $group: {
          _id: "$sessionId",
          messageCount: { $sum: 1 }, // Count messages in each session
        },
      },
      {
        $match: {
          messageCount: { $gt: 1 }, // Exclude sessions with only 1 message
        },
      },
      {
        $count: "total",
      },
    ]);
  
    return result[0]?.total || 0;
  }
  
  async getAllLibraryStories(): Promise<[]> {
    return Stories.find({}).lean<[]>().exec();
  }

  async saveFeedback({
    feedbackCode,
    comment,
    storyPrompt,
    userId,
  }: {
    feedbackCode: number;
    comment: string;
    storyPrompt: string;
    userId: number;
  }): Promise<void> {
    const feedback = new Feedback({
      feedbackCode,
      comment,
      storyPrompt,
      userId,
    });
    feedback.save();
  }

  async getLibraryStoryById(id: string): Promise<any> {
    return Stories.findById(id).lean().exec();
  }

  async saveStory({
    title,
    description,
    category,
  }: {
    title: string;
    description: string;
    category: string;
  }): Promise<void> {
    const story = new Stories({
      title,
      description,
      category,
    });
    story.save();
  }
}

export const storage = new MemStorage();
