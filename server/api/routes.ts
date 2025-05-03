import _ from "lodash";
import jwt from "jsonwebtoken";
import { jwtDecode } from "jwt-decode";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { ElevenLabsClient } from "elevenlabs";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { storyRequestSchema, chatSessionSchema } from "../../shared/schema.js";
import { generateStory, generateStoryStream } from "./openai.js";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { knowledgeBase } from "./knowledgeBase.js";
import { z } from "zod";

dotenv.config();
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY ||
  "sk_9948ca82b777baf06144ad33ce6bd7c550433eea212c98b2";
const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});
type TokenPayload = {
  id: number;
  email: string;
  exp: number;
};

type GoogleTokenPayload = {
  aud: string; 
  azp: string; 
  email: string; 
  email_verified: boolean; 
  exp: number; 
  family_name: string;
  given_name: string; 
  iat: number; 
  iss: string; 
  jti: string; 
  name: string;
  nbf: number;
  picture: string;
  sub: string;
};

interface AuthRequest extends Request {
  userId?: number;
}

const JWT_SECRET =
  process.env.JWT_SECRET || "SECRET_KEY_FOR_PROJECT_SOLANASTORIES";

// Create a schema for text-to-speech requests
const ttsRequestSchema = z.object({
  text: z.string().min(1),
});

const validateEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const regex = /^\d{10}$/;
  return regex.test(phone);
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize knowledge base
  await knowledgeBase.initialize().catch((err) => {
    console.error("Failed to initialize knowledge base:", err);
  });

  const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1]; // Extract the token

    try {
      req.userId = verifyToken(token);
      next();
    } catch (error) {
      return res.status(403).json({ message: "Unauthorized: Invalid token" });
    }
  };

  const verifyToken = (token: string): number => {
    const decodedValue = jwtDecode<TokenPayload>(token);
    if (!decodedValue || !decodedValue.id) {
      throw new Error("Invalid token");
    }
    return decodedValue.id;
  };

  // API routes

  app.get("/", (req, res) => res.send("Express on Vercel"));

  app.get(
    "/chat-history",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      const page = req.query.page || 1;
      const perPage = req.query.perPage || 10;
      const userId = req.userId;
      try {
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const chatHistory = await storage.getChatHistory(
          userId,
          Number(page),
          Number(perPage)
        );
        const totalCount = await storage.getChatHistoryCount(userId);
        const totalPages = Math.ceil(totalCount / Number(perPage));
        const formattedHistory = chatHistory.map((chat) => ({
          id: chat._id,
          sessionId: chat.sessionId,
          messages: chat.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        }));
        return res.json({
          history: formattedHistory,
          totalCount,
          totalPages,
          currentPage: Number(page),
          perPage: Number(perPage),
        });
      } catch (error) {
        console.error("Error retrieving chat history:", error);
        return res
          .status(500)
          .json({ message: "Failed to retrieve chat history" });
      }
    }
  );

  app.get(
    "/chat-session",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const rawSession = req.query.sessionId;

        // Narrow: if it's an array, pick the first element; if it's a ParsedQs, convert to string; else it’s undefined
        const sessionId =
        Array.isArray(rawSession)
          ? rawSession[0]
          : typeof rawSession === "string"
          ? rawSession
          : undefined;
        const userId = req.userId;
        if (!sessionId || !userId) {
          return res.status(400).json({ message: "Session ID is required" });
        }

        const messages = await storage.getMessagesBySessionId(sessionId);

        // If this is a new session, add the welcome message
        if (messages.length === 0) {
          await storage.saveMessage({
            role: "assistant",
            content:
              "Hello! I'm SolanaStories, a storytelling bot for children ages 5-10. I can create fun adventures that teach Solana blockchain concepts through magical tales! What kind of story would you like for your child today?",
            sessionId,
            userId,
          });
        }

        // Get fresh messages
        const updatedMessages = await storage.getMessagesBySessionId(sessionId);

        // Format messages for the frontend
        const formattedMessages = updatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        return res.json({
          sessionId,
          messages: formattedMessages,
        });
      } catch (error) {
        console.error("Error retrieving session:", error);
        return res
          .status(500)
          .json({ message: "Failed to retrieve chat session" });
      }
    }
  );

  app.post(
    "/chat-generate",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        // Validate request body
        const vetUserId = req.userId;
        const validatedData = storyRequestSchema.parse({
          ...req.body,
          userId: vetUserId,
        });
        const { message, sessionId, userId } = validatedData;

        // Save user message
        await storage.saveMessage({
          role: "user",
          content: message,
          sessionId,
          userId,
        });

        // Get conversation history
        const historyMessages = await storage.getMessagesBySessionId(sessionId);

        // Format messages for OpenAI
        const conversationHistory = historyMessages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));

        // Generate story response
        const storyResponse = await generateStory(message, conversationHistory);

        // Save assistant response
        await storage.saveMessage({
          role: "assistant",
          content: storyResponse,
          sessionId,
          userId,
        });

        return res.json({
          message: storyResponse,
        });
      } catch (error) {
        console.error("Error generating story:", error);

        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          return res.status(400).json({ message: validationError.message });
        }

        return res.status(500).json({
          message:
            error instanceof Error ? error.message : "Failed to generate story",
        });
      }
    }
  );

  // Text-to-Speech API endpoint - actual audio generation
  app.post("/text-to-speech-speak", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = ttsRequestSchema.parse(req.body);
      const { text } = validatedData;

      // Only process a limited amount of text
      const limitedText = text.substring(0, 5000); // Limit very long texts

      // Check for browser fallback mode parameter
      const useBrowserFallback = req.query.fallback === "true";

      if (useBrowserFallback) {
        return res.json({
          success: true,
          message: "Use the browser's speech synthesis API",
          text: limitedText,
          speechSettings: {
            rate: 1.1,
            pitch: 1.4,
            volume: 1.0,
          },
        });
      }

      // Generate speech with ElevenLabs
      const audioStream = await client.textToSpeech.convert(
        "jBpfuIE2acCO8z3wKNLl",
        {
          text: limitedText,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
        }
      );

      // Set response headers for audio
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-cache");

      // Pipe the audio stream directly to the response
      audioStream.pipe(res);
    } catch (error) {
      console.error("Error in text-to-speech API:", error);

      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }

      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to process text-to-speech request",
      });
    }
  });

  app.post("/signup", async (req: Request, res: Response) => {
    try {
      const userName = _.get(req, "body.username", "");
      const password = _.get(req, "body.password", "");
      const email = _.get(req, "body.email", "");
      const phone = _.get(req, "body.phone", "");
      // Validate request body

      if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      const alreadyExists = await storage.getUserByEmail(email);

      if (alreadyExists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      if (phone && !validatePhone(phone)) {
        return res.status(400).json({ message: "Invalid phone number" });
      }

      if (userName.length < 1) {
        return res.status(400).json({ message: "Username is required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const saltRounds = 10; // Recommended number of rounds
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await storage.createUser({
        username: userName,
        password: hashedPassword,
        email,
        phone,
      });

      console.log(user);
      const token = jwt.sign({ id: user.id, email: user.email, username: userName }, JWT_SECRET, {
        expiresIn: "30d",
      });
      return res.status(200).json({ token });
    } catch (error) {
      console.error("Error in signup API:", error);
      return res.status(500).json({ message: "Failed to sign up" });
    }
  });

  app.post("/login", async (req: Request, res: Response) => {
    try {
      const email = _.get(req, "body.email", "");
      const password = _.get(req, "body.password", "");
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }
      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, {
        expiresIn: "30d",
      });
      return res.status(200).json({ token });
    } catch (error) {
      console.error("Error in login API:", error);
      return res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.get("/library-stories", authMiddleware, async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const stories = await storage.getAllLibraryStoriesForUser(userId);
      const formattedStories = stories.map((story: any) => ({
        id: story._id,
        title: story.title,
        description: story.description,
        createdAt: story.createdAt,
        category: story.category,
      }));
      return res.json({ stories: formattedStories });
    } catch (error) {
      console.error("Error retrieving library stories:", error);
      return res.status(500).json({ message: "Failed to retrieve stories" });
    }
  });

  app.post("/submit-feedback", authMiddleware, async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const feedbackCode = _.get(req, "body.feedbackCode", null);
      const comment = _.get(req, "body.comment", "");
      const storyPrompt = _.get(req, "body.storyPrompt", "");

      if (feedbackCode || comment || storyPrompt) {
        await storage.saveFeedback({feedbackCode, comment, storyPrompt, userId});
        return res.status(200).json({ message: "Feedback submitted successfully" });
      }
      return res
          .status(400)
          .json({ message: "Feedback code, comment, and story prompt are required" });
    } catch (err) {
      console.error("Error submitting feedback:", err);
      return res.status(500).json({ message: "Failed to submit feedback" });
    }
  })

  app.post("/google-login", async (req: Request, res: Response) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ message: "Credential is required" });
      }
      const decodedValue = jwtDecode<GoogleTokenPayload>(credential);
      if (!decodedValue || !decodedValue.email) {
        return res.status(401).json({ message: "Invalid token" });
      }
      const email = decodedValue.email;
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          username: decodedValue.name,
          email,
          phone: "9009099009",
          password: "testtestetst123123123hahw3@",
        });
      }
      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, {
        expiresIn: "30d",
      });
      return res.status(200).json({ token });
    } catch (error) {
      console.error("Error in Google login API:", error);
      return res.status(500).json({ message: "Failed to log in with Google" });
    }
  });

  app.get("/library-story", authMiddleware, async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const storyId = _.get(req, "query.id", null);
      if (!storyId) {
        return res.status(400).json({ message: "Story ID is required" });
      }
      const story = await storage.getLibraryStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      const formattedStory = {
        id: story._id,
        title: story.title,
        description: story.description,
        createdAt: story.createdAt,
        category: story.category,
      };
      return res.json(formattedStory);
    } catch (error) {
      console.error("Error retrieving library story:", error);
      return res.status(500).json({ message: "Failed to retrieve story" });
    }
  });

  app.post("/add-story-to-library", authMiddleware, async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const title = _.get(req, "body.title", "");
      const description = _.get(req, "body.description", "");
      const category = "Saved Stories";
      await storage.saveStory({
        userId,
        title,
        description,
        category,
      });
      return res.status(200).json({ message: "Story added to library" });
    } catch (error) {
      console.error("Error adding story to library:", error);
      return res.status(500).json({ message: "Failed to add story to library" });
    }
  });

  app.post(
    "/story-generate",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { message } = req.body;
  
        // Set headers for streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
  
        let fullResponse = "";
  
        for await (const chunk of generateStoryStream(message, [])) {
          fullResponse += chunk;
          res.write(`data: ${chunk}\n\n`);
        }
  
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (error) {
        console.error("Error generating story:", error);
        res.write("data: [ERROR]\n\n");
        res.end();
      }
    }
  );
  

  const httpServer = createServer(app);
  return httpServer;
}