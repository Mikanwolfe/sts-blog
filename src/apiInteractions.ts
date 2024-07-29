import ora from 'ora';
import { ChatCompletionParams } from './types';
import { CONFIG } from './config';

const MAX_RETRIES = 3;
const TIMEOUT = 5000; // 5 seconds

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  });

  clearTimeout(id);

  return response;
}

export async function requestChatCompletion(params: ChatCompletionParams, retryCount = 0): Promise<any> {
  const { model = CONFIG.defaultModel, messages } = params;
  const spinner = ora('Fetching chat completion...').start();

  try {
    const response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, messages })
    }, TIMEOUT);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    spinner.succeed('Chat completion fetched successfully');
    return data;
  } catch (error: any) {
    spinner.fail(`Failed to fetch chat completion: ${error.message}`);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await delay(1000); // Wait for 1 second before retrying
      return requestChatCompletion(params, retryCount + 1);
    } else {
      throw error;
    }
  }
}