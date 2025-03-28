import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { storyRequestSchema, chatSessionSchema } from "@shared/schema";
import { generateStory } from "./openai";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { knowledgeBase } from "./knowledgeBase";
import { z } from "zod";

// Create a schema for text-to-speech requests
const ttsRequestSchema = z.object({
  text: z.string().min(1),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize knowledge base
  await knowledgeBase.initialize().catch(err => {
    console.error("Failed to initialize knowledge base:", err);
  });

  // API routes
  app.get("/api/chat/session/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      const messages = await storage.getMessagesBySessionId(sessionId);
      
      // If this is a new session, add the welcome message
      if (messages.length === 0) {
        await storage.saveMessage({
          role: "assistant",
          content: "Hello! I'm SolanaStories, a storytelling bot for children ages 5-10. I can create fun adventures that teach Solana blockchain concepts through magical tales! What kind of story would you like for your child today?",
          sessionId
        });
      }
      
      // Get fresh messages
      const updatedMessages = await storage.getMessagesBySessionId(sessionId);
      
      // Format messages for the frontend
      const formattedMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      return res.json({
        sessionId,
        messages: formattedMessages
      });
    } catch (error) {
      console.error("Error retrieving session:", error);
      return res.status(500).json({ message: "Failed to retrieve chat session" });
    }
  });

  app.post("/api/chat/generate", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = storyRequestSchema.parse(req.body);
      const { message, sessionId } = validatedData;
      
      // Save user message
      await storage.saveMessage({
        role: "user",
        content: message,
        sessionId
      });
      
      // Get conversation history
      const historyMessages = await storage.getMessagesBySessionId(sessionId);
      
      // Format messages for OpenAI
      const conversationHistory = historyMessages.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }));
      
      // Generate story response
      const storyResponse = await generateStory(message, conversationHistory);
      
      // Save assistant response
      await storage.saveMessage({
        role: "assistant",
        content: storyResponse,
        sessionId
      });
      
      return res.json({
        message: storyResponse
      });
    } catch (error) {
      console.error("Error generating story:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate story"
      });
    }
  });

  // Text-to-Speech API endpoint - returns the text to be spoken by the client
  app.post("/api/text-to-speech/speak", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = ttsRequestSchema.parse(req.body);
      const { text } = validatedData;
      
      // Only process a limited amount of text
      const limitedText = text.substring(0, 5000); // Limit very long texts
      
      // Return JSON with instructions for the client to use native speech synthesis
      return res.json({
        success: true,
        message: "Use the browser's speech synthesis API",
        text: limitedText,
        // Add these optional parameters to help the client with speech settings
        speechSettings: {
          rate: 0.9,    // Slightly slower than default
          pitch: 1.1,   // Slightly higher pitch (good for children's stories)
          volume: 1.0,  // Full volume
        }
      });
    } catch (error) {
      console.error("Error in text-to-speech API:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process text-to-speech request"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
