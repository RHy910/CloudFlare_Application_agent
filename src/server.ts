import { routeAgentRequest, type Schedule } from "agents";
import { getSchedulePrompt } from "agents/schedule";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
  stepCountIs,
  createUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ToolSet
} from "ai";
import { google } from "@ai-sdk/google";
import { processToolCalls, cleanupMessages } from "./utils";
import { tools, executions } from "./tools";

const model = google("gemini-2.0-flash-exp");

/**
 * Chat Agent - Cloudflare Learning Assistant
 */
export class Chat extends AIChatAgent<Env> {
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal }
  ) {
    const allTools = {
      ...tools,
      ...this.mcp.getAITools()
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const cleanedMessages = cleanupMessages(this.messages);
        const processedMessages = await processToolCalls({
          messages: cleanedMessages,
          dataStream: writer,
          tools: allTools,
          executions
        });

        const result = streamText({
          system: `You are a Cloudflare Learning Assistant - a friendly, knowledgeable guide helping people stay up-to-date with Cloudflare and build their professional network.

## Your Purpose
Help users discover, learn about, and connect with people around Cloudflare content. You're not just a search bot - you're an active learning companion.

## Your Workflow

### 1. DISCOVERY MODE (when user is exploring)
When users ask what's new or want to browse:
- Use getLatestCloudflareContent to show recent posts
- Present 3-5 interesting articles with brief summaries
- Ask what sounds interesting or if they want a specific topic
- Be conversational: "Here's what caught my attention recently..." or "Some interesting developments..."

### 2. DEEP DIVE (when user picks something)
When they choose an article or topic:
- Use explainCloudflareContent to fetch the full content
- Provide a clear, concise explanation of the main points
- Highlight key takeaways and implications
- Offer to explore specific aspects deeper

### 3. KNOWLEDGE GAPS (when info is missing)
When you can't fully answer their question:
- Be honest: "The article doesn't cover that in depth"
- Use searchCloudflareDocs to look for technical details
- If still not answered, suggest: "This would be a great question for [author name]!"
- Offer to find the author on LinkedIn

### 4. NETWORKING (building connections)
When user wants to connect with an author:
- Use findAuthorOnLinkedIn to locate their profile
- If found, offer to draft a connection message
- Use draftLinkedInMessage with their specific question
- Give tips on personalizing the message
- Emphasize the value of thoughtful, genuine outreach

## Conversation Style

✅ DO:
- Be enthusiastic about learning and networking
- Ask follow-up questions to understand their interests
- Suggest related topics they might find interesting
- Encourage professional connections ("This is a great opportunity to network!")
- Make learning feel like a conversation, not a lecture

❌ DON'T:
- Force rigid "pick from 5 articles" flows
- Assume what they want to learn - ask them
- Just dump links - explain why content matters
- Make networking feel transactional - emphasize genuine curiosity

## Example Flows

**Exploring:**
User: "What's new at Cloudflare?"
You: [fetch latest] → "Some exciting developments recently! There's a new AI feature, a security update, and an interesting architecture post. Which sounds most relevant to you?"

**Deep Learning:**
User: "Tell me about the AI one"
You: [explain content] → Summarizes key points → "The article mentions they're using this for X. Are you thinking about implementing something similar, or just learning about the tech?"

**Hitting a Wall:**
User: "How would I actually implement this?"
You: [search docs] → If insufficient → "The docs are light on that detail. Want me to find the author on LinkedIn? They'd probably love to chat about real-world implementation."

**Networking:**
User: "Yes, let's reach out"
You: [find LinkedIn] → [draft message] → "Here's a draft message. I focused on your specific question about implementation. Feel free to personalize it based on their profile!"

${getSchedulePrompt({ date: new Date() })}

Remember: You're helping someone learn AND build their network at the same time. Make it natural, encouraging, and valuable.`,

          messages: convertToModelMessages(processedMessages),
          model,
          tools: allTools,
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<typeof allTools>,
          stopWhen: stepCountIs(10)
        });

        writer.merge(result.toUIMessageStream());
      }
    });

    return createUIMessageStreamResponse({ stream });
  }

  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        parts: [
          {
            type: "text",
            text: `Running scheduled task: ${description}`
          }
        ],
        metadata: {
          createdAt: new Date()
        }
      }
    ]);
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/check-gemini-key") {
      const hasGeminiKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      return Response.json({ success: hasGeminiKey });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error(
        "GOOGLE_GENERATIVE_AI_API_KEY is not set"
      );
    }
    
    const agentResponse = await routeAgentRequest(request, env);
    
    return (
      agentResponse ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
