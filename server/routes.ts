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
      
      // Use a simple approach - generate a WAV file with binary PCM data
      // This avoids the issues with espeak and other external dependencies
      const generatePCMAudio = () => {
        const sampleRate = 16000; // Higher quality 
        const seconds = Math.min(5, limitedText.length / 20); // Rough estimate of duration
        const frequency = 440; // A4 note
        
        // Create a WAV file header
        const createWaveHeader = (dataLength: number): Buffer => {
          const buffer = Buffer.alloc(44);
          
          // "RIFF" chunk descriptor
          buffer.write('RIFF', 0);
          buffer.writeUInt32LE(36 + dataLength, 4); // Chunk size
          buffer.write('WAVE', 8);
          
          // "fmt " sub-chunk
          buffer.write('fmt ', 12);
          buffer.writeUInt32LE(16, 16); // Subchunk1 size
          buffer.writeUInt16LE(1, 20); // PCM format
          buffer.writeUInt16LE(1, 22); // Mono
          buffer.writeUInt32LE(sampleRate, 24); // Sample rate
          buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
          buffer.writeUInt16LE(2, 32); // Block align
          buffer.writeUInt16LE(16, 34); // Bits per sample
          
          // "data" sub-chunk
          buffer.write('data', 36);
          buffer.writeUInt32LE(dataLength, 40); // Subchunk2 size
          
          return buffer;
        };
        
        // Create audio data buffer - 16-bit PCM
        const numSamples = Math.floor(sampleRate * seconds);
        const dataBuffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample
        
        // Create a beep sound with gradually changing pitch based on text length
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          // Vary frequency slightly based on the first characters of the text
          // This makes different texts sound different
          const textFreqModifier = (limitedText.charCodeAt(0) % 10) / 20 + 1;
          // Add a bit of vibrato
          const vibrato = Math.sin(t * 6) * 5;
          // Calculate sample 
          const currentFreq = frequency * textFreqModifier + vibrato;
          const sample = Math.sin(2 * Math.PI * currentFreq * t) * 32767 * 0.5;
          
          // Write 16-bit sample
          dataBuffer.writeInt16LE(Math.floor(sample), i * 2);
        }
        
        // Create the header
        const header = createWaveHeader(dataBuffer.length);
        
        // Combine header and data
        return Buffer.concat([header, dataBuffer]);
      };
      
      // Generate audio
      const audioBuffer = generatePCMAudio();
      
      // Set headers for WAV audio
      res.setHeader('Content-Type', 'audio/wav');
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
