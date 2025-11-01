# 🤖 Cloudflare Learning Assistant

![npm i agents command](./npm-agents-banner.svg)

<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/agents-starter"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare"/></a>

A Cloudflare Learning Assistant powered by Cloudflare's Agent platform and Google's Gemini model. This project helps you discover, learn about, and network around Cloudflare content.

## Capabilities

This assistant can help you with:

- 📰 **Discover Latest Cloudflare Content**: Get the latest blog posts, announcements, and updates from Cloudflare
- 🧠 **Deep Dive into Articles**: Fetch and explain specific Cloudflare blog posts and documentation
- 🔍 **Search Cloudflare Docs**: Find technical details, implementation guides, and API references
- 🔗 **Author Networking**: Find authors on LinkedIn and draft personalized connection messages
- 📅 **Task Scheduling**: Schedule one-time, delayed, or recurring tasks using cron
- 💬 **Intelligent Conversations**: Engage in natural learning-focused discussions with context awareness
- 🌐 **Multi-Model Support**: Currently powered by Google Gemini 2.0 Flash, with easy integration for other AI providers

## Features

- 💬 Interactive chat interface with AI
- 🛠️ Built-in tool system with automatic execution
- 📅 Advanced task scheduling (one-time, delayed, and recurring via cron)
- 🌓 Dark/Light theme support
- ⚡️ Real-time streaming responses
- 🔄 State management and chat history
- 🎨 Modern, responsive UI
- 🔗 LinkedIn integration for professional networking

## Prerequisites

- Cloudflare account
- Google Generative AI API key (Gemini API)
- Node.js 18 or later

## Quick Start

1. Create a new project:

```bash
npx create-cloudflare@latest --template cloudflare/agents-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment:

Create a `.dev.vars` file:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key
```

4. Run locally:

```bash
npm start
```

5. Deploy:

```bash
npm run deploy
```

## Project Structure

```
├── src/
│   ├── app.tsx        # Chat UI implementation
│   ├── server.ts      # Chat agent logic
│   ├── tools.ts       # Tool definitions
│   ├── utils.ts       # Helper functions
│   └── styles.css     # UI styling
├── README.md          # Project documentation
└── PROMPTS.md         # Prompts library and tracking
```

## Customization Guide

### Current Tools

The assistant comes equipped with these tools:

1. **getLatestCloudflareContent**: Fetches recent blog posts from Cloudflare
2. **explainCloudflareContent**: Extracts and explains specific articles
3. **searchCloudflareDocs**: Searches Cloudflare documentation
4. **findAuthorOnLinkedIn**: Locates authors on LinkedIn
5. **draftLinkedInMessage**: Drafts professional connection messages
6. **scheduleTask**: Schedules tasks for future execution
7. **getScheduledTasks**: Lists all scheduled tasks
8. **cancelScheduledTask**: Cancels a scheduled task

All tools execute automatically - no confirmation required!

### Adding New Tools

Add new tools in `tools.ts` using the tool builder:

```ts
// Example of an auto-executing tool
const getCurrentTime = tool({
  description: "Get current server time",
  inputSchema: z.object({}),
  execute: async () => new Date().toISOString()
});
```

### Use a different AI model provider

The current implementation uses the [`ai-sdk`](https://sdk.vercel.ai/docs/introduction) and the [Google Gemini provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google), but you can use any AI model provider by:

1. Installing an alternative AI provider for the `ai-sdk`, such as the [`workers-ai-provider`](https://sdk.vercel.ai/providers/community-providers/cloudflare-workers-ai) or [`anthropic`](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic) provider:
2. Using the Cloudflare [Workers AI + AI Gateway](https://developers.cloudflare.com/ai-gateway/providers/workersai/#workers-binding) binding API directly

For example, to use the [`workers-ai-provider`](https://sdk.vercel.ai/providers/community-providers/cloudflare-workers-ai), install the package:

```sh
npm install workers-ai-provider
```

Add an `ai` binding to `wrangler.jsonc`:

```jsonc
// rest of file
  "ai": {
    "binding": "AI"
  }
// rest of file
```

Replace the import and usage in `server.ts`:

```diff
// server.ts
// Change the imports
- import { google } from "@ai-sdk/google";
+ import { createWorkersAI } from 'workers-ai-provider';

// Create a Workers AI instance
+ const workersai = createWorkersAI({ binding: env.AI });

// Use it when calling the streamText method
- const model = google("gemini-2.0-flash-exp");
+ const model = workersai("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b")
```

Commit your changes and then run the assistant as per the rest of this README.

### Modifying the UI

The chat interface is built with React and can be customized in `app.tsx`:

- Modify the theme colors in `styles.css`
- Add new UI components in the chat container
- Customize message rendering and tool confirmation dialogs
- Add new controls to the header

### Example Workflows

**Discover & Learn:**
```
User: "What's new at Cloudflare?"
Assistant: Fetches latest posts → Shows 3-5 articles with summaries → Asks what's interesting
```

**Deep Dive:**
```
User: "Tell me about the AI feature"
Assistant: Fetches article → Explains key points → Offers to explore deeper
```

**Find Technical Details:**
```
User: "How do I implement this?"
Assistant: Searches docs → If insufficient, suggests contacting the author
```

**Network:**
```
User: "Find the author on LinkedIn"
Assistant: Locates profile → Drafts personalized message → Suggests personalization tips
```

## Learn More

- [Prompts Library](./PROMPTS.md) - All prompts and examples used in this assistant
- [`agents`](https://github.com/cloudflare/agents/blob/main/packages/agents/README.md)
- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

## License

MIT
