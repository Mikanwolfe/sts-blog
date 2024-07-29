import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { CONFIG } from './config';
import { GenerationLog } from './types';
import { requestChatCompletion } from './apiInteractions';
import * as fileOperations from './fileOperations';
import { promptForAnswers, openInEditor } from './userInteractions';
import matter from 'gray-matter';


function substituteParams(content: string, params: Record<string, string>): string {
  let substitutedContent = content;

  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    substitutedContent = substitutedContent.replace(regex, value);
  }

  return substitutedContent;
}

export async function newArticle() {
  const generationLog: GenerationLog = {
    timestamp: new Date().toISOString(),
    template: '',
    brief: '',
    userParams: {},
    llmQuestions: [],
    userAnswers: {},
    title: ''
  };

  const templates = await fileOperations.getTemplates();
  const selectedTemplate = await select({
    message: 'Select an article type:',
    choices: templates.map(template => ({ name: template, value: template })),
  });

  const templateContent = await fileOperations.readTemplateWithFrontMatter(selectedTemplate);
  if (!templateContent) {
    throw new Error(`Template ${selectedTemplate} not found`);
  }

  const brief = await input({ message: "Briefly describe the goals of the article, and any key points." });

  console.log("\nPlease provide the following template parameters:");
  const userParamAnswers = await promptForAnswers(templateContent.params.user_params);
  const questionsResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: "You are an LLM function and reply only in the format requested" },
      { role: "user", content: `What are some questions that a technical audience member might have if they do not understand the following brief? Avoid simple questions and focus on complex topics. Context: '${JSON.stringify(userParamAnswers)}' Brief: '${brief}'. Provide a maximum of 5 questions. Only respond in a JSON list, e.g. ['What is the core motivation behind the idea?', ...]` }
    ]
  });

  const llmQuestions = JSON.parse(questionsResponse.choices[0].message.content);
  if (!Array.isArray(llmQuestions)) {
    throw new Error('Unexpected response from LLM. Expected an array of questions.');
  }

  console.log('\nPlease answer the following questions about your article:');
  const userAnswers = await promptForAnswers(llmQuestions.slice(0, 5));
  console.log('\nThank you for answering the questions!');
  const title = await input({ message: "Article Title:" });

  // Substitute user params in the template content
  const substitutedTemplateContent = substituteParams(templateContent.content, userParamAnswers);

  const articleResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: "You are an LLM function and reply only in the format requested" },
      { role: "user", content: `Context: ${JSON.stringify(userAnswers)}\n Use the following template to generate an article skeleton for the user to build on. Fill in any content in [ ] brackets \n${substitutedTemplateContent}\nReply in markdown, ensure you fill in some of the QA context. Ensure you refine provide better headings for better readability and flow.` }
    ]
  });

  const articleContent = articleResponse.choices[0].message.content;
  // Create front matter
  const frontMatter = {
    title: title, // You might want to ask for a separate title if this is just a file name
    date: new Date().toISOString()
  };

  // Add front matter to the article content
  const contentWithFrontMatter = matter.stringify(articleContent, frontMatter);


  const outputPath = await fileOperations.writeArticle(articleContent, CONFIG.outputDir, title);
  console.log(`Generated blog post written to ${outputPath}.`);

  const editorOpen = await select({
    message: "Open editor?",
    choices: [{ name: "Yes", value: true }, { name: "No", value: false }],
  });

  if (editorOpen) {
    await openInEditor(outputPath);
    console.log("File edited successfully.");
  }


  generationLog.brief = brief;
  generationLog.template = selectedTemplate;
  generationLog.userParams = userParamAnswers;
  generationLog.llmQuestions = llmQuestions;
  generationLog.userAnswers = userAnswers;
  generationLog.title = title;
  await fileOperations.writeGenerationLog(generationLog, CONFIG.outputDir);

  // Add a delay for 2 seconds to ensure the message is seen by the user
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log("Generation complete. Happy writing!");
}

export async function refineArticle() {
  // Get and process articles
  const articleFiles = await fileOperations.getArticles();

  if (articleFiles.length === 0) {
    console.log(chalk.yellow("No articles found. Please generate an article first."));
    return;
  }

  // Read all articles asynchronously
  const articlePromises = articleFiles.map(async file => {
    const article = await fileOperations.readArticleWithFrontMatter(file);
    if (!article) {
      throw new Error(`Article ${file} not found`);
    }
    return {
      file,
      title: article.params?.title || 'Untitled',
      date: article.params?.date || ''
    };
  });

  const articles = await Promise.all(articlePromises);

  // Sort articles by date, most recent first
  articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedArticle = await select({
    message: 'Select an article to refine:',
    choices: articles.map(article => ({
      name: `${article.title} (${new Date(article.date).toLocaleString()})`,
      value: article.file
    })),
  });

  const articleContent = await fileOperations.readArticleWithFrontMatter(selectedArticle);

  if (!articleContent) {
    throw new Error("Article content is null");
  }

  // Get and process characters
  const characterFiles = await fileOperations.getCharacters();

  if (characterFiles.length === 0) {
    console.log(chalk.yellow("No characters found. Please add some character files first."));
    return;
  }

  // Read all characters asynchronously
  const characterPromises = characterFiles.map(async file => {
    const character = await fileOperations.readCharacter(file);
    return {
      file,
      name: character?.name || 'Unnamed Character'
    };
  });

  const characters = await Promise.all(characterPromises);

  const selectedCharacter = await select({
    message: 'Select a character to use:',
    choices: characters.map(character => ({
      name: character.name,
      value: character.file
    })),
  });

  const characterData = await fileOperations.readCharacter(selectedCharacter);

  if (!characterData) {
    throw new Error("Character data is null");
  }

  const reducedCharacterData = {
    name: characterData.name,
    description: characterData.description,
    few_shot_examples: characterData.few_shot_examples,
    tone_and_voice: characterData.tone_and_voice,
    post_prompt: characterData.post_prompt
  };

  console.log(chalk.cyan("Refining article..."));

  const refineResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: characterData.system_prompt },
      { role: "user", content: `Revise the following article as if the following character is writing it. Ensure you stick to structure, and only revise the tone and wording of the content. \n${articleContent.content}\nCharacter writing the article: ${JSON.stringify(reducedCharacterData)}\nEnsure you stay in character. Follow the way of writing that the character uses. Adjust the headings, content, and thoughts behind the article as needed. Expand on your explanations. Reply in Markdown.` }
    ]
  });

  const refinedContent = refineResponse.choices[0].message.content;
  const outputPath = await fileOperations.writeArticle(refinedContent, CONFIG.completeDir, articleContent.params.title ?? "Refined Article");
  console.log(chalk.green(`Refined blog post written to ${outputPath}.`));
  console.log(chalk.green("Refinement complete. Happy writing!"));
}

export async function publishArticle() {
  console.log("Publish article functionality not implemented yet.");
}

export async function listStatus() {
  console.log("List status functionality not implemented yet.");
}


export async function regenerateArticle() {
  const logFiles = await fileOperations.getGenerationLogs();

  if (logFiles.length === 0) {
    console.log(chalk.yellow("No generation logs found. Please generate an article first."));
    return;
  }

  // Read all logs asynchronously
  const logPromises = logFiles.map(async file => {
    const log = await fileOperations.readGenerationLog(file);
    return { file, title: log?.title || 'Untitled', timestamp: log?.timestamp || '' };
  });

  const logs = await Promise.all(logPromises);

  // Sort logs by timestamp, most recent first
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const selectedLog = await select({
    message: 'Select an article to regenerate:',
    choices: logs.map(log => ({
      name: `${log.title} (${new Date(log.timestamp).toLocaleString()})`,
      value: log.file
    })),
  });

  const log = await fileOperations.readGenerationLog(selectedLog);
  console.log(chalk.cyan("Regenerating article from log..."));

  if (!log) {
    throw new Error("Log is null");
  }

  const templateContent = await fileOperations.readTemplateWithFrontMatter(log.template);
  if (!templateContent) {
    throw new Error(`Template ${log.template} not found`);
  }

  console.log(chalk.yellow("\nCurrent parameters:"));
  console.log(log.userParams);
  const modifyParams = await select({
    message: 'Do you want to modify these parameters?',
    choices: [{ name: "Yes", value: true }, { name: "No", value: false }],
  });

  let userParamAnswers = log.userParams;
  if (modifyParams) {
    userParamAnswers = await promptForAnswers(templateContent.params.user_params);
  }

  console.log(chalk.yellow("\nCurrent answers:"));
  console.log(log.userAnswers);
  const modifyAnswers = await select({
    message: 'Do you want to modify these answers?',
    choices: [{ name: "Yes", value: true }, { name: "No", value: false }],
  });

  let userAnswers = log.userAnswers;
  if (modifyAnswers) {
    userAnswers = await promptForAnswers(log.llmQuestions);
  }

  const articleResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: "You are an LLM function and reply only in the format requested" },
      { role: "user", content: `Context: ${JSON.stringify(userAnswers)}\n Use the following template to generate an article skeleton for the user to build on. Ensure you leave questions for user input: \n${templateContent.content}\nReply in markdown, ensure you fill in some of the QA context.` }
    ]
  });
  const articleContent = articleResponse.choices[0].message.content;

  const newTitle = await input({ message: "File save name (press Enter to keep the original):", default: log.title });
  const outputPath = await fileOperations.writeArticle(articleContent, CONFIG.outputDir, newTitle);
  console.log(chalk.green(`Regenerated blog post written to ${outputPath}.`));

  const newLog: GenerationLog = {
    ...log,
    timestamp: new Date().toISOString(),
    userParams: userParamAnswers,
    userAnswers: userAnswers,
    title: newTitle
  };
  const newLogPath = await fileOperations.writeGenerationLog(newLog, CONFIG.outputDir);
  console.log(chalk.green(`Updated generation log written to ${newLogPath}.`));

  const editorOpen = await select({
    message: "Open editor?",
    choices: [{ name: "Yes", value: true }, { name: "No", value: false }],
  });
  if (editorOpen) {
    await openInEditor(outputPath);
    console.log(chalk.green("File edited successfully."));
  }
  console.log(chalk.green("Regeneration complete. Happy writing!"));
}