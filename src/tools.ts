/**
 * Cloudflare Learning Assistant Tools
 * Helps users discover, learn about, and network around Cloudflare content
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";
import type { Chat } from "./server";
import { getCurrentAgent } from "agents";
import { scheduleSchema } from "agents/schedule";

/**
 * Get latest Cloudflare blog posts for discovery/learning
 * This is the entry point - shows users what's new to explore
 */
const getLatestCloudflareContent = tool({
  description: "Get the latest blog posts and announcements from Cloudflare. Use this when users want to see what's new, learn about recent updates, or discover interesting Cloudflare content.",
  inputSchema: z.object({
    count: z.number().optional().default(5).describe("Number of recent posts to fetch (1-10)"),
    topic: z.string().optional().describe("Optional topic filter like 'AI', 'security', 'workers', etc.")
  }),
  execute: async ({ count = 5, topic }) => {
    try {
      // Fetch Cloudflare blog RSS feed
      const rssUrl = 'https://blog.cloudflare.com/rss/';
      const response = await fetch(rssUrl);
      
      if (!response.ok) {
        return `Error fetching blog feed: ${response.status}`;
      }

      const xml = await response.text();
      
      // Parse RSS feed for recent posts
      const items: Array<{ title: string; link: string; date: string; description: string; author?: string }> = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
        const item = match[1];
        
        // Extract fields
        const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item);
        const linkMatch = /<link>(.*?)<\/link>/.exec(item);
        const dateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(item);
        const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item);
        const authorMatch = /<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/.exec(item);
        
        if (titleMatch && linkMatch) {
          const title = titleMatch[1];
          const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : '';
          
          // Apply topic filter if specified
          if (topic) {
            const searchText = `${title} ${description}`.toLowerCase();
            if (!searchText.includes(topic.toLowerCase())) {
              continue;
            }
          }
          
          items.push({
            title,
            link: linkMatch[1],
            date: dateMatch ? dateMatch[1] : 'Unknown date',
            description: description + '...',
            author: authorMatch ? authorMatch[1] : undefined
          });
        }
      }

      if (items.length === 0) {
        return topic 
          ? `No recent posts found about "${topic}". Try a broader topic or remove the filter.`
          : "Unable to fetch recent posts. Please try again.";
      }

      return {
        source: "Cloudflare Blog",
        topic: topic || "All topics",
        count: items.length,
        posts: items.map((item, i) => ({
          position: i + 1,
          title: item.title,
          url: item.link,
          publishDate: item.date,
          summary: item.description,
          author: item.author
        })),
        suggestion: "Pick a post that interests you and I can explain it in detail, or ask me to search for more specific topics!"
      };
    } catch (error) {
      console.error("Error fetching Cloudflare content:", error);
      return `Error fetching content: ${error}`;
    }
  }
});

/**
 * Fetch and explain a specific Cloudflare blog post or doc page
 * Used when user wants to learn about a specific article
 */
const explainCloudflareContent = tool({
  description: "Fetch and explain the content of a specific Cloudflare blog post or documentation page. Use this when a user wants to learn about a specific article or doc.",
  inputSchema: z.object({
    url: z.string().describe("The URL of the Cloudflare blog post or doc page to explain")
  }),
  execute: async ({ url }) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        return `Error fetching content: ${response.status}`;
      }

      const html = await response.text();
      
      // Extract article content (this is a simplified version)
      // For blog posts, content is usually in article tags
      let content = '';
      
      // Try to extract main content
      const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/.exec(html);
      if (articleMatch) {
        content = articleMatch[1];
      } else {
        // Fallback: get content from main tag
        const mainMatch = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html);
        if (mainMatch) {
          content = mainMatch[1];
        }
      }
      
      // Strip HTML tags and clean up
      content = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 4000); // Limit content length
      
      // Extract author if available
      const authorMatch = /<meta name="author" content="([^"]+)"/.exec(html) ||
                          /class="author[^"]*"[^>]*>([^<]+)</.exec(html) ||
                          /By ([A-Z][a-z]+ [A-Z][a-z]+)/.exec(html);
      
      const title = /<title>([^<]+)<\/title>/.exec(html);
      
      return {
        url,
        title: title ? title[1].replace(' | Cloudflare', '').trim() : 'Unknown',
        author: authorMatch ? authorMatch[1] : 'Unknown',
        contentPreview: content,
        note: "I've read the article. Ask me questions about it or request a specific explanation!"
      };
    } catch (error) {
      console.error("Error fetching content:", error);
      return `Error fetching content: ${error}`;
    }
  }
});

/**
 * Find article author on LinkedIn for networking
 * When user has questions beyond what's in the docs/post
 */
const findAuthorOnLinkedIn = tool({
  description: "Find the author of a Cloudflare article on LinkedIn to enable networking and deeper learning. Use this when the user wants to connect with the author or has questions not answered in the content.",
  inputSchema: z.object({
    authorName: z.string().describe("Full name of the article author"),
    articleTitle: z.string().describe("Title of the article they wrote"),
    articleUrl: z.string().describe("URL of the article")
  }),
  execute: async ({ authorName, articleTitle, articleUrl }) => {
    try {
      // Search Google for LinkedIn profile
      const searchQuery = `${authorName} Cloudflare site:linkedin.com/in/`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return `Error searching for LinkedIn profile: ${response.status}`;
      }

      const html = await response.text();
      
      // Find LinkedIn profile URL
      const linkedInRegex = /https:\/\/www\.linkedin\.com\/in\/([a-zA-Z0-9-]+)/;
      const match = linkedInRegex.exec(html);
      
      if (!match) {
        return {
          found: false,
          authorName,
          message: `Couldn't find a LinkedIn profile for ${authorName}. You could try searching manually on LinkedIn or look for them on Cloudflare's team page.`
        };
      }

      const profileUrl = match[0];
      
      return {
        found: true,
        authorName,
        profileUrl,
        articleTitle,
        articleUrl,
        suggestion: "I found their LinkedIn profile! Would you like me to draft a connection message?"
      };
    } catch (error) {
      console.error("Error finding LinkedIn profile:", error);
      return `Error searching LinkedIn: ${error}`;
    }
  }
});

/**
 * Draft a thoughtful LinkedIn connection message
 * Helps user network professionally while learning
 */
const draftLinkedInMessage = tool({
  description: "Draft a professional LinkedIn connection message to a Cloudflare author. Use this after finding their profile to help the user network and ask for deeper insights.",
  inputSchema: z.object({
    authorName: z.string().describe("Name of the person to connect with"),
    articleTitle: z.string().describe("Title of their article the user read"),
    articleUrl: z.string().describe("URL of the article"),
    userQuestion: z.string().optional().describe("Specific question the user has (optional)"),
    userBackground: z.string().optional().describe("Brief context about the user's background/interest (optional)")
  }),
  execute: async ({ authorName, articleTitle, articleUrl, userQuestion, userBackground }) => {
    // Create a thoughtful, personalized connection message
    const firstName = authorName.split(' ')[0];
    
    let message = `Hi ${firstName},\n\n`;
    message += `I recently read your article "${articleTitle}" and found it really insightful. `;
    
    if (userBackground) {
      message += `${userBackground} `;
    }
    
    if (userQuestion) {
      message += `\n\nI have a question that I couldn't find answered in the article: ${userQuestion}\n\n`;
      message += `Would you be open to sharing your thoughts or pointing me to additional resources?\n\n`;
    } else {
      message += `I'd love to connect and learn more about your work at Cloudflare.\n\n`;
    }
    
    message += `Thanks for sharing your knowledge with the community!\n\n`;
    message += `Best regards`;
    
    return {
      authorName,
      articleTitle,
      articleUrl,
      message,
      tips: [
        "Keep it under 300 characters for a connection request (LinkedIn limit)",
        "Personalize further based on their LinkedIn profile",
        "Be specific about what you found interesting",
        "Show genuine curiosity, not just self-promotion"
      ],
      shortVersion: `Hi ${firstName}, I really enjoyed your article "${articleTitle}" and would love to connect to learn more about your work at Cloudflare. Thanks for sharing your insights with the community!`
    };
  }
});

/**
 * Search Cloudflare documentation for technical details
 * Falls back to this when blog posts don't have enough depth
 */
const searchCloudflareDocs = tool({
  description: "Search Cloudflare's technical documentation when you need implementation details, API references, or how-to guides that aren't in blog posts.",
  inputSchema: z.object({
    query: z.string().describe("Technical topic to search for"),
    maxResults: z.number().optional().default(3)
  }),
  execute: async ({ query, maxResults = 3 }) => {
    try {
      const searchUrl = `https://www.google.com/search?q=site:developers.cloudflare.com+${encodeURIComponent(query)}&num=${maxResults}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return `Error searching docs: ${response.status}`;
      }

      const html = await response.text();
      const results = [];
      const linkRegex = /<a href="(https:\/\/developers\.cloudflare\.com[^"]+)"[^>]*><br><h3[^>]*>([^<]+)<\/h3>/g;
      
      let match;
      while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
        results.push({
          title: match[2],
          url: match[1]
        });
      }

      if (results.length === 0) {
        return `No documentation found for "${query}". This might be a good opportunity to reach out to a Cloudflare expert!`;
      }

      return {
        query,
        source: "Cloudflare Documentation",
        results: results.map((r, i) => ({
          position: i + 1,
          title: r.title,
          url: r.url
        }))
      };
    } catch (error) {
      return `Error searching docs: ${error}`;
    }
  }
});

// Keep existing scheduling tools
const scheduleTask = tool({
  description: "Schedule a task to be executed at a later time",
  inputSchema: scheduleSchema,
  execute: async ({ when, description }) => {
    const { agent } = getCurrentAgent<Chat>();
    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date
        : when.type === "delayed"
          ? when.delayInSeconds
          : when.type === "cron"
            ? when.cron
            : throwError("not a valid schedule input");
    try {
      agent!.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  }
});

const getScheduledTasks = tool({
  description: "List all scheduled tasks",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  }
});

const cancelScheduledTask = tool({
  description: "Cancel a scheduled task by ID",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to cancel")
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Task ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("Error canceling scheduled task", error);
      return `Error canceling task ${taskId}: ${error}`;
    }
  }
});

/**
 * Export all learning assistant tools
 */
export const tools = {
  // Core learning flow
  getLatestCloudflareContent,
  explainCloudflareContent,
  searchCloudflareDocs,
  
  // LinkedIn networking
  findAuthorOnLinkedIn,
  draftLinkedInMessage,
  
  // Scheduling (keep existing)
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask
} satisfies ToolSet;

/**
 * No executions needed - all tools execute automatically
 */
export const executions = {};