// app/lib/.server/llm/api-key.ts
import { env } from 'node:process';

export type AWSCredentials = {
  accessKeyId: string | null;
  secretAccessKey: string | null;
  region: string;
};

export function getAPIKey(cloudflareEnv: Env, provider: string): string | null {
  if (typeof window !== 'undefined') {  // Check if running in a browser
    try {
      // **IMPORTANT:** In a real application, replace this with a secure method
      // of fetching API keys from your backend.  Do not store API keys directly
      // in localStorage in production!  This is for demonstration purposes only.
      return localStorage.getItem(`${provider}_API_KEY`) || null;
    } catch (error) {
      console.error(`Error retrieving API key from localStorage for ${provider}:`, error);
      return null;
    }
  } else if (import.meta.env.DEV) { // For local Node.js development
    switch (provider) {
      case 'Anthropic':
        return env.ANTHROPIC_API_KEY || null;
      case 'Gemini': // Example: Add Gemini
        return env.GEMINI_API_KEY || null;
      case 'OpenAI':
        return env.OPENAI_API_KEY || null;
      case 'Groq':
        return env.GROQ_API_KEY || null;
      case 'OpenRouter':
        return env.OPEN_ROUTER_API_KEY || null;
      // Add other providers here as needed...
      default:
        return null;
    }
  } else { // For Cloudflare Workers
    switch (provider) {
      case 'Anthropic':
        return cloudflareEnv.ANTHROPIC_API_KEY || null;
      case 'Gemini': // Example: Add Gemini
        return cloudflareEnv.GEMINI_API_KEY || null;
      case 'OpenAI':
        return cloudflareEnv.OPENAI_API_KEY || null;
      case 'Groq':
        return cloudflareEnv.GROQ_API_KEY || null;
      case 'OpenRouter':
        return cloudflareEnv.OPEN_ROUTER_API_KEY || null;
       // Add other providers here as needed...
      default:
        return null;
    }
  }
}



export function getAWSCredentials(cloudflareEnv: Env): AWSCredentials | null {
  if (typeof window !== 'undefined') { // Browser environment
      try {
      // Retrieve from localStorage (INSECURE - DO NOT USE FOR PRODUCTION)
      return {
        accessKeyId: localStorage.getItem("AWS_ACCESS_KEY_ID") || null,
        secretAccessKey: localStorage.getItem("AWS_SECRET_ACCESS_KEY") || null,
        region: localStorage.getItem("AWS_REGION") || "us-east-1", // Provide a default
      };
    } catch (error) {
      console.error("Error retrieving AWS credentials from localStorage:", error);
      return null;
    }
 } else if (import.meta.env.DEV) { // Local development (Node.js)
    return {
      accessKeyId: env.AWS_ACCESS_KEY_ID || null,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || null,
      region: env.AWS_REGION || "us-east-1", // Default region
    };

  } else { // Cloudflare Workers (production)
    return {
      accessKeyId: cloudflareEnv.AWS_ACCESS_KEY_ID,
      secretAccessKey: cloudflareEnv.AWS_SECRET_ACCESS_KEY,
      region: cloudflareEnv.AWS_REGION || 'us-east-1', // Default
    };
  }
}
