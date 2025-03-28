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

  // Text-to-Speech API endpoint
  app.post("/api/text-to-speech/speak", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = ttsRequestSchema.parse(req.body);
      const { text } = validatedData;
      
      // Only process a limited amount of text
      const limitedText = text.substring(0, 5000); // Limit very long texts
      
      // Attempt to use espeak if available
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execPromise = promisify(exec);
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        
        // Create temp directory if it doesn't exist
        const tempDir = path.join(os.tmpdir(), 'solana-stories-tts');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate a temporary filename
        const timestamp = Date.now();
        const tempFilePath = path.join(tempDir, `speech-${timestamp}.wav`);
        
        // Use espeak for Linux
        const command = `espeak -w "${tempFilePath}" "${limitedText.replace(/"/g, '\\"')}"`;
        
        // Execute the command
        await execPromise(command);
        
        // Read the file and send it as audio
        const audioData = fs.readFileSync(tempFilePath);
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', audioData.length);
        
        // Send the audio file
        res.send(audioData);
        
        // Clean up the temporary file (async)
        fs.unlink(tempFilePath, (err: Error | null) => {
          if (err) console.error("Failed to delete temporary file:", err);
        });
        
        // Successfully returned audio
        return;
      } catch (execError: unknown) {
        console.error("Error using espeak for TTS:", execError);
        // Continue to fallback
      }
      
      // Fallback: Generate a simple audio notification
      // This is a minimal fallback that just creates a beep sound
      // to notify the user that audio should be playing
      
      // Create a simple sine wave tone (1 second beep)
      const generateTone = () => {
        // Audio parameters
        const sampleRate = 8000;
        const seconds = 1;
        const frequency = 440; // A4 note
        
        // Create the audio buffer
        const numSamples = sampleRate * seconds;
        const buffer = Buffer.alloc(numSamples);
        
        // Fill the buffer with a simple sine wave
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          const sample = Math.sin(2 * Math.PI * frequency * t) * 127;
          buffer[i] = Math.floor(sample + 128); // Convert to 0-255 range
        }
        
        return buffer;
      };
      
      const audioBuffer = generateTone();
      
      // Set headers for raw audio
      res.setHeader('Content-Type', 'audio/basic');
      res.setHeader('Content-Length', audioBuffer.length);
      
      // Send the audio
      res.send(audioBuffer);
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
