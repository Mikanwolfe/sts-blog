#!/usr/bin/env node

import { input, select } from '@inquirer/prompts';
import { promises as fs} from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import matter from 'gray-matter';

// Define the interface for chat completion parameters
interface ChatCompletionParams {
  apiKey: string;
  siteUrl?: string;
  siteName?: string;
  model: string;
  messages: { role: string; content: string }[];
}

// Function to fetch templates from the 'templates' directory
async function getTemplates(): Promise<string[]> {
  const templateDir = path.join(process.cwd(), 'templates');
  const files = await fs.readdir(templateDir);
  return files.filter(file => file.endsWith('.md'));
}

// Function to read a template file and extract front matter and content
async function readTemplateWithFrontMatter(templateName: string): Promise<{ params: any[], content: string } | null> {
  const templateDir = path.join(process.cwd(), 'templates');
  const filePath = path.join(templateDir, templateName);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      params: data.params || [],
      content: content
    };
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
    return null;
  }
}

// Function to fetch chat completion
async function fetchChatCompletion(params: ChatCompletionParams): Promise<any> {
  const { apiKey, siteUrl, siteName, model, messages } = params;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      ...(siteUrl && { "HTTP-Referer": siteUrl }), // Optional, for including your app on openrouter.ai rankings.
      ...(siteName && { "X-Title": siteName }), // Optional. Shows in rankings on openrouter.ai.
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Main function to execute the script
async function main() {
  dotenv.config();

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not found in .env');
    process.exit(1);
  }

  try {
    const templates = await getTemplates();
    const selectedTemplate = await select(
      {
        message: 'Select an article type:',
        choices: templates.map(template => ({ name: template, value: template })),
      },
    );

    const brief = await input({ message: "Briefly describe the goals of the article, and any key points." });

    // const answers = await askQuestions(selectedTemplate);

    // Here you would process the answers and generate the blog post
    // For now, we'll just log the results
    console.log('Generated blog post would go here, using template:', selectedTemplate);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
