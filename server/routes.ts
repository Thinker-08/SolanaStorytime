import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { storyRequestSchema, chatSessionSchema } from "@shared/schema";
import { generateStory } from "./openai";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { knowledgeBase } from "./knowledgeBase";
import { z } from "zod";
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

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

  // Text-to-Speech API endpoint - actual audio generation
  app.post("/api/text-to-speech/speak", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = ttsRequestSchema.parse(req.body);
      const { text } = validatedData;
      
      // Only process a limited amount of text
      const limitedText = text.substring(0, 5000); // Limit very long texts
      
      // Check for browser fallback mode parameter
      const useBrowserFallback = req.query.fallback === 'true';
      
      if (useBrowserFallback) {
        // Return JSON with instructions for the client to use native speech synthesis
        return res.json({
          success: true,
          message: "Use the browser's speech synthesis API",
          text: limitedText,
          speechSettings: {
            rate: 0.9,    // Slightly slower than default
            pitch: 1.1,   // Slightly higher pitch (good for children's stories)
            volume: 1.0,  // Full volume
          }
        });
      }
      
      // Create temp file names
      const tempDir = os.tmpdir();
      const tempTextFile = path.join(tempDir, `tts-text-${uuidv4()}.txt`);
      const tempWavFile = path.join(tempDir, `tts-audio-${uuidv4()}.wav`);
      
      // Write text to a temporary file to avoid command line issues with quotes, etc.
      fs.writeFileSync(tempTextFile, limitedText);
      
      // Generate speech with espeak
      const command = `espeak -v en-us+f3 -s 130 -p 50 -a 200 -w ${tempWavFile} -f ${tempTextFile}`;
      
      // Create a promise to handle the async execution
      const generateSpeech = new Promise<void>((resolve, reject) => {
        exec(command, (error: any) => {
          if (error) {
            console.error("Error generating speech:", error);
            // Delete temp files
            try {
              fs.unlinkSync(tempTextFile);
            } catch (e) {
              console.error("Failed to delete temp text file:", e);
            }
            
            // Return fallback JSON if espeak fails
            res.json({
              success: false,
              message: "Server-side speech generation failed, use browser fallback",
              text: limitedText,
              speechSettings: {
                rate: 0.9,
                pitch: 1.1,
                volume: 1.0,
              }
            });
            resolve();
            return;
          }
          
          // Read audio file
          fs.readFile(tempWavFile, (err: any, data: Buffer) => {
            // Delete the temp files regardless of success
            try {
              fs.unlinkSync(tempTextFile);
              fs.unlinkSync(tempWavFile);
            } catch (e) {
              console.error("Failed to delete temp files:", e);
            }
            
            if (err) {
              console.error("Error reading audio file:", err);
              res.json({
                success: false,
                message: "Failed to read audio file, use browser fallback",
                text: limitedText,
                speechSettings: {
                  rate: 0.9,
                  pitch: 1.1,
                  volume: 1.0,
                }
              });
              resolve();
              return;
            }
            
            // Set response headers for audio
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Content-Length', data.length);
            res.setHeader('Cache-Control', 'no-cache');
            
            // Return the audio data
            res.send(data);
            resolve();
          });
        });
      });
      
      // Wait for the speech generation to complete
      await generateSpeech;
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
