import { input, select } from '@inquirer/prompts';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { CONFIG } from './config';

export async function promptForAnswers(questions: string[]): Promise<{ [key: string]: string }> {
  const answers: { [key: string]: string } = {};
  for (const question of questions) {
    answers[question] = await input({ message: question });
  }
  return answers;
}

export async function openInEditor(filePath: string, editor: string = CONFIG.defaultEditor): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(editor, [filePath], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Editor exited with code ${code}`));
    });
    child.on('error', (err) => reject(new Error(`Failed to start editor: ${err.message}`)));
  });
}

export function clearConsole() {
  console.clear();
}

export function displayTitle() {
  console.log(chalk.bold.blue('Simple Templating System: Blog'));
}

export function displayMenuText() {
  console.log(chalk.blue('Please select an option:'));
}

export async function mainMenu() {
  while (true) {
    clearConsole();
    displayTitle();
    displayMenuText();

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: chalk.white('New Article'), value: 'new' },
        { name: chalk.white('Refine Article'), value: 'refine' },
        { name: chalk.white('Regenerate Article'), value: 'regenerate' },
        { name: chalk.white('Publish Article'), value: 'publish' },
        { name: chalk.white('List Status'), value: 'status' },
        { name: chalk.white('Exit'), value: 'exit' }
      ],
    });

    return action;
  }
}