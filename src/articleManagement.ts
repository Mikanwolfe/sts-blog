import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { CONFIG } from './config';
import { GenerationLog } from './types';
import { requestChatCompletion } from './apiInteractions';
import * as fileOperations from './fileOperations';
import { promptForAnswers, openInEditor } from './userInteractions';

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
  const title = await input({ message: "File save name:" });

  const articleResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: "You are an LLM function and reply only in the format requested" },
      { role: "user", content: `Context: ${JSON.stringify(userAnswers)}\n Use the following template to generate an article skeleton for the user to build on. Ensure you leave questions for user input: \n${templateContent.content}\nReply in markdown, ensure you fill in some of the QA context.` }
    ]
  });

  const articleContent = articleResponse.choices[0].message.content;
  const outputPath = await fileOperations.writeArticle(articleContent, CONFIG.outputDir);
  console.log(`Generated blog post written to ${outputPath}.`);

  const editorOpen = await select({ 
    message: "Open editor?",
    choices: [{ name: "Yes", value: true }, { name: "No", value: false }],
  });

  if (editorOpen) {
    await openInEditor(outputPath);
    console.log("File edited successfully.");
  }

  generationLog.template = selectedTemplate;
  generationLog.brief = brief;
  generationLog.userParams = userParamAnswers;
  generationLog.llmQuestions = llmQuestions;
  generationLog.userAnswers = userAnswers;
  generationLog.title = title;
  await fileOperations.writeGenerationLog(generationLog, CONFIG.outputDir);

  console.log("Generation complete. Happy writing!");
}

export async function refineArticle() {
  const articles = await fileOperations.getArticles();
  const selected = await select({
    message: 'Select an article to process:',
    choices: articles.map(article => ({ name: article, value: article })),
  });

  const articleContent = await fileOperations.readArticleWithFrontMatter(selected);

  const characters = await fileOperations.getCharacters();
  const selectedCharacter = await select({
    message: 'Select a character to use:',
    choices: characters.map(character => ({ name: character, value: character })),
  });

  const characterData = await fileOperations.readCharacter(selectedCharacter);

  const reducedCharacterData = {
    name: characterData.name,
    description: characterData.description,
    few_shot_examples: characterData.few_shot_examples,
    tone_and_voice: characterData.tone_and_voice,
    post_prompt: characterData.post_prompt
  }

  const refineResponse = await requestChatCompletion({
    messages: [
      { role: "system", content: characterData?.system_prompt },
      { role: "user", content: `Revise the following article as if the following character is writing it. Ensure you stick to the template of the article, and only revise the tone and wording of the content. \n${articleContent?.content}\nCharacter writing the article: ${JSON.stringify(characterData)}\n` }
    ]
  });

  const refinedContent = refineResponse.choices[0].message.content;
  const outputPath = await fileOperations.writeArticle(refinedContent, CONFIG.completeDir, articleContent?.params?.title ?? "");
  console.log(`Generated blog post written to ${outputPath}.`);
  console.log("Refinement complete. Happy writing!");
}

export async function publishArticle() {
    console.log("Publish article functionality not implemented yet.");
  }
  
  export async function listStatus() {
    console.log("List status functionality not implemented yet.");
  }
  
  export async function regenerateArticle() {
    const logFiles = await fileOperations.getGenerationLogs();
    const generationLogs = logFiles.filter(file => file.startsWith('generation_log_') && file.endsWith('.json'));
  
    if (generationLogs.length === 0) {
      console.log(chalk.yellow("No generation logs found. Please generate an article first."));
      return;
    }
  
    const selectedLog = await select({
      message: 'Select a generation log to regenerate from:',
      choices: generationLogs.map(log => ({ name: log, value: log })),
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