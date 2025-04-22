import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types for knowledge base data
interface StoryData {
  "Story Name,Story": string;
}

interface RedditPost {
  body: string;
  category: string;
  communityName: string;
  flair: string;
  numberOfComments: string | number;
  username: string;
  Storyline: string;
  "Unique Storyline": string;
}

interface SolanaData {
  data: string;
}

// Class to manage knowledge base assets
export class KnowledgeBase {
  private systemPrompt: string | null = null;
  private stories: StoryData[] = [];
  private redditPosts: RedditPost[] = [];
  private solanaBlockchainBasics: SolanaData[] = [];
  private solanaNfts: SolanaData[] = [];
  private solanaNews: SolanaData[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Define paths to knowledge assets
      const assetsPath = path.resolve(__dirname, '../../attached_assets');
      
      // Load all knowledge files
      this.systemPrompt = await this.loadTextFile(path.join(assetsPath, 'system-prompt.txt'));
      this.stories = await this.loadJsonFile<StoryData[]>(path.join(assetsPath, 'stories.json'));
      this.redditPosts = await this.loadJsonFile<RedditPost[]>(path.join(assetsPath, 'reddit.json'));
      this.solanaBlockchainBasics = await this.loadJsonFile<SolanaData[]>(path.join(assetsPath, 'solana-blockchain-basics.json'));
      this.solanaNfts = await this.loadJsonFile<SolanaData[]>(path.join(assetsPath, 'solana-nfts.json'));
      this.solanaNews = await this.loadJsonFile<SolanaData[]>(path.join(assetsPath, 'solana-news.json'));

      this.isInitialized = true;
      console.log('Knowledge base initialized successfully');
    } catch (error) {
      console.error('Failed to initialize knowledge base:', error);
      throw error;
    }
  }

  private async loadTextFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error loading text file ${filePath}:`, error);
      throw error;
    }
  }

  private async loadJsonFile<T>(filePath: string): Promise<T> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error loading JSON file ${filePath}:`, error);
      throw error;
    }
  }

  // Method to get system prompt
  getSystemPrompt(): string {
    if (!this.systemPrompt) {
      throw new Error('System prompt not initialized');
    }
    return this.systemPrompt;
  }

  // Method to get knowledge context
  getKnowledgeContext(): string {
    let context = "Knowledge Base:\n";
    
    // Add Solana blockchain basics
    context += "## Solana Blockchain Basics\n";
    this.solanaBlockchainBasics.forEach(item => {
      context += item.data.substring(0, 1000) + "...\n\n";
    });
    
    // Add Solana NFTs info
    context += "## Solana NFTs\n";
    this.solanaNfts.forEach(item => {
      context += item.data.substring(0, 1000) + "...\n\n";
    });
    
    // Add Solana news
    context += "## Solana News\n";
    this.solanaNews.forEach(item => {
      context += item.data.substring(0, 1000) + "...\n\n";
    });
    
    // Add Story patterns (sample)
    context += "## Children's Story Patterns\n";
    const sampleStories = this.stories.slice(0, 5);
    sampleStories.forEach(story => {
      const [name, content] = story["Story Name,Story"].split(',');
      context += `${name}: ${content.substring(0, 300)}...\n\n`;
    });
    
    // Add Reddit posts (sample)
    context += "## Community Discussions\n";
    const samplePosts = this.redditPosts.slice(0, 5);
    samplePosts.forEach(post => {
      if (post.body && post.Storyline) {
        context += `${post.Storyline}: ${post.body.substring(0, 200)}...\n\n`;
      }
    });
    
    return context;
  }
}

export const knowledgeBase = new KnowledgeBase();
