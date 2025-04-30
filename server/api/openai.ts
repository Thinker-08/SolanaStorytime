import OpenAI from "openai";
import { knowledgeBase } from "./knowledgeBase.js";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateStory(userMessage: string, conversationHistory: Message[] = []): Promise<string> {
  try {
    await knowledgeBase.initialize();

    // Get system prompt and knowledge context
    const systemPrompt = knowledgeBase.getSystemPrompt();
    const knowledgeContext = knowledgeBase.getKnowledgeContext();

    // Build the messages array
    const messages: Message[] = [
      {
        role: "system",
        content: `${systemPrompt}\n\n${knowledgeContext}`
      },
      ...conversationHistory,
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't create a story right now. Please try again.";
  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error("Failed to generate the story. Please try again later.");
  }
}

export async function* generateStoryStream(
  userMessage: string,
  conversationHistory: Message[] = []
): AsyncGenerator<string> {
  await knowledgeBase.initialize();

  const systemPrompt = knowledgeBase.getSystemPrompt();
  const knowledgeContext = knowledgeBase.getKnowledgeContext();

  const messages: Message[] = [
    { role: 'system', content: `${systemPrompt}\n\n${knowledgeContext}` },
    ...conversationHistory,
    { role: 'user',   content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1500,
    stream: true,
  });

  // Track if the last yielded character was whitespace
  let prevEndedWithSpace = true;

  for await (const chunk of stream) {
    const raw = chunk.choices?.[0]?.delta?.content;
    if (!raw) continue;

    let content = raw;

    // 1) If we already ended in whitespace, strip any extra leading spaces
    if (prevEndedWithSpace) {
      content = content.replace(/^\s+/, '');
    }
    // 2) Otherwise, if we have no leading space but need one, add it
    else if (!/^\s/.test(content)) {
      content = ' ' + content;
    }

    // Update for next iteration
    prevEndedWithSpace = /\s$/.test(content);

    yield content;
  }
}

