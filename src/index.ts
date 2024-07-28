#!/usr/bin/env node

import { input, select } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import matter from 'gray-matter';
import ora from 'ora';
import { spawn } from 'child_process';
import chalk from 'chalk';

// Types
interface ChatCompletionParams {
  siteUrl?: string;
  siteName?: string;
  model?: string;
  messages: { role: string; content: string }[];
}

interface TemplateContent {
  params: any[];
  content: string;
}

// Configuration
const CONFIG = {
  templateDir: path.join(process.cwd(), 'templates'),
  outputDir: path.join(process.cwd(), 'output'),
  defaultModel: 'mistralai/mixtral-8x22b-instruct',
  defaultEditor: 'hx'
};

// File Operations
async function getTemplates(): Promise<string[]> {
  const files = await fs.readdir(CONFIG.templateDir);
  return files.filter(file => file.endsWith('.md'));
}

async function readTemplateWithFrontMatter(templateName: string): Promise<TemplateContent | null> {
  const filePath = path.join(CONFIG.templateDir, templateName);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    return { params: data.params || [], content };
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
    return null;
  }
}

async function writeArticle(content: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const outputPath = path.join(CONFIG.outputDir, `${timestamp}.md`);
  await fs.writeFile(outputPath, content, 'utf-8');
  return outputPath;
}

// API Interactions
async function requestChatCompletion(params: ChatCompletionParams): Promise<any> {
  const { model = CONFIG.defaultModel, messages } = params;
  const spinner = ora('Fetching chat completion...').start();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, messages })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    spinner.succeed('Chat completion fetched successfully');
    return data;
  } catch (error: any) {
    spinner.fail(`Failed to fetch chat completion: ${error.message}`);
    throw error;
  }
}

// User Interactions
async function promptForAnswers(questions: string[]): Promise<{ [key: string]: string }> {
  const answers: { [key: string]: string } = {};
  for (const question of questions) {
    answers[question] = await input({ message: question });
  }
  return answers;
}

async function openInEditor(filePath: string, editor: string = CONFIG.defaultEditor): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(editor, [filePath], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Editor exited with code ${code}`));
    });
    child.on('error', (err) => reject(new Error(`Failed to start editor: ${err.message}`)));
  });
}

// Article Management
async function newArticle() {
  const templates = await getTemplates();
  const selectedTemplate = await select({
    message: 'Select an article type:',
    choices: templates.map(template => ({ name: template, value: template })),
  });

  const brief = await input({ message: "Briefly describe the goals of the article, and any key points." });

  const questionsResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: "You are an LLM function and reply only in the format requested" },
      { role: "user", content: `What are some questions that a technical audience member might have if they do not understand the following brief? Brief: '${brief}'. Provide a maximum of 5 questions. Only respond in a JSON list, e.g. ['What is the core motivation behind the idea?', ...]` }
    ]
  });

  const llmQuestions = JSON.parse(questionsResponse.choices[0].message.content);
  if (!Array.isArray(llmQuestions)) {
    throw new Error('Unexpected response from LLM. Expected an array of questions.');
  }

  console.log('\nPlease answer the following questions about your article:');
  const userAnswers = await promptForAnswers(llmQuestions.slice(0, 5));
  console.log('\nThank you for answering the questions! Generating article now...');

  const templateContent = await readTemplateWithFrontMatter(selectedTemplate);
  if (!templateContent) {
    throw new Error(`Template ${selectedTemplate} not found`);
  }

  const articleResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: "You are an LLM function and reply only in the format requested" },
      { role: "user", content: `Context: ${JSON.stringify(userAnswers)}\n Use the following template to generate an article skeleton for the user to build on. Ensure you leave questions for user input: \n${templateContent.content}\nReply in markdown, ensure you fill in some of the QA context.` }
    ]
  });

  const articleContent = articleResponse.choices[0].message.content;
  const outputPath = await writeArticle(articleContent);
  console.log(`Generated blog post written to ${outputPath}.`);

  const editorOpen = await select({ 
    message: "Open editor?",
    choices: [{ name: "Yes", value: true }, { name: "No", value: false }],
  });

  if (editorOpen) {
    await openInEditor(outputPath);
    console.log("File edited successfully.");
  }

  console.log("Generation complete. Happy writing!");
}

async function refineArticle() {
  console.log("Refine article functionality not implemented yet.");
  // TODO: Implement article refinement logic
}

async function listStatus() {
  console.log("List status functionality not implemented yet.");
  // TODO: Implement status listing logic
}
async function mainMenu() {
  while (true) {
    clearConsole();
    displayTitle();
    displayMenuText();

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: chalk.white('New Article'), value: 'new' },
        { name: chalk.white('Refine Article'), value: 'refine' },
        { name: chalk.white('List Status'), value: 'status' },
        { name: chalk.white('Exit'), value: 'exit' }
      ],
    });

    switch (action) {
      case 'new': await newArticle(); break;
      case 'refine': await refineArticle(); break;
      case 'status': await listStatus(); break;
      case 'exit': 
        console.log(chalk.green.bold("Goodbye!"));
        return;
    }
  }
}

// Function to clear the console
function clearConsole() {
  console.clear();
}

// Function to display the title
function displayTitle() {
  console.log(chalk.bold.blue('Simple Templating System: Blog'));
}

// Function to display menu text
function displayMenuText() {
  console.log(chalk.blue('Please select an option:'));
}


// Main Execution
async function main() {
  dotenv.config();
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not found in .env');
    process.exit(1);
  }

  try {
    await mainMenu();
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();