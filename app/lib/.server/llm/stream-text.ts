// lib/.server/llm/stream-text.ts
import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getModel, getBedrockModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS, MAX_TOKENS_BEDROCK } from './constants';
import { getSystemPrompt } from './prompts';
import { MODEL_LIST, DEFAULT_MODEL, DEFAULT_PROVIDER } from '~/utils/constants';
import { getAPIKey, getAWSCredentials } from '~/lib/.server/llm/api-key'; // getAPIKeyとgetAWSCredentialsをインポート

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
  model?: string; // Add optional model property
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

function extractModelFromMessage(message: Message): { model: string; content: string } {
  const modelRegex = /^\[Model: (.*?)\]\n\n/;
  const match = message.content.match(modelRegex);

  if (match) {
    const model = match[1];
    const content = message.content.replace(modelRegex, '');
    return { model, content };
  }

  // Default model if not specified
  return { model: DEFAULT_MODEL, content: message.content };
}

export function streamText(messages: Messages, env: Env, options?: StreamingOptions) {
  let currentModel = DEFAULT_MODEL;
  const processedMessages = messages.map((message) => {
    if (message.role === 'user') {
      const { model, content } = extractModelFromMessage(message);
      if (model && MODEL_LIST.find((m) => m.name === model)) {
        currentModel = model; // Update the current model
      }
      return { ...message, content };
    }
    return message;
  });

  const provider = MODEL_LIST.find((model) => model.name === currentModel)?.provider || DEFAULT_PROVIDER;

  const apiKey = getAPIKey(env, provider); // APIキーを取得
  const awsCreds = provider === 'Bedrock' ? getAWSCredentials() : null; // Bedrockの場合のみAWS認証情報を取得

  let modelSelection = getModel(provider, currentModel, env); // Default model selection

  if (provider === 'Bedrock' && !apiKey && awsCreds) {
    // APIキーがなく、AWS認証情報がある場合、AWS認証情報を使用
    modelSelection = getBedrockModel('anthropic.claude-v2', awsCreds); // awsCredsを渡す
  } else if (provider === 'Bedrock' && apiKey) {
    // APIキーがある場合は、それを使用 (Gemini)
    modelSelection = getModel(provider, currentModel, env); //
  } else if (provider !== 'Ollama' && !apiKey) {
    // Ollama以外のプロバイダーでAPIキーがない場合はエラー
    throw new Error(`API key is required for ${provider}`);
  }

  const maxTokens = provider === 'Bedrock' ? MAX_TOKENS_BEDROCK : MAX_TOKENS;

  return _streamText({
    model: modelSelection,
    system: getSystemPrompt(),
    maxTokens,
    messages: convertToCoreMessages(processedMessages),
    ...options,
  });
}
