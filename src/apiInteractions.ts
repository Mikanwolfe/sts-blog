import ora from 'ora';
import chalk from 'chalk';
import { ChatCompletionParams } from './types';
import { CONFIG } from './config';

const MAX_RETRIES = 3;
const TIMEOUT = 5000; // 5 seconds

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



export function logLLMMessages(messages: any[], title: string = 'Messages sent to LLM') {
  console.log(chalk.bgBlue.white.bold(`\n${title}\n`));

  messages.forEach((message, index) => {
    const roleColor = message.role === 'user' ? chalk.green : chalk.yellow;
    console.log(roleColor.bold(`[${message.role.toUpperCase()}]`));

    // Split content into lines and add indentation
    const contentLines = message.content.split('\n');
    contentLines.forEach((line: any) => {
      console.log(roleColor(`  ${line}`));
    });

    // Add a separator between messages, except for the last one
    if (index < messages.length - 1) {
      console.log(chalk.gray('------------------------'));
    }
  });

  console.log(chalk.bgBlue.white.bold(`\nEnd of messages\n`));
}


export function logLLMResponse(response: any, title: string = 'LLM Response') {
  console.log(chalk.bgMagenta.white.bold(`\n${title}\n`));

  if (response.choices && response.choices.length > 0) {
    const message = response.choices[0].message;
    console.log(chalk.cyan.bold(`[${message.role.toUpperCase()}]`));

    // Split content into lines and add indentation
    const contentLines = message.content.split('\n');
    contentLines.forEach((line: any) => {
      console.log(chalk.cyan(`  ${line}`));
    });

    // Log additional information
    console.log(chalk.gray('\nAdditional Information:'));
    console.log(chalk.gray(`  Model: ${response.model}`));
    console.log(chalk.gray(`  Prompt Tokens: ${response.usage.prompt_tokens}`));
    console.log(chalk.gray(`  Completion Tokens: ${response.usage.completion_tokens}`));
    console.log(chalk.gray(`  Total Tokens: ${response.usage.total_tokens}`));
  } else {
    console.log(chalk.red('No response content available'));
  }

  console.log(chalk.bgMagenta.white.bold(`\nEnd of response\n`));
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

  logLLMMessages(messages, `Messages for ${model}`);

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

    // Log the LLM response
    logLLMResponse(data, `Response from ${model}`);

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