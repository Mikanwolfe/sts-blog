import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from './config';
import { TemplateContent, GenerationLog } from './types';

export async function getTemplates(): Promise<string[]> {
    const files = await fs.readdir(CONFIG.templateDir);
    return files.filter(file => file.endsWith('.md'));
}

export async function getArticles(): Promise<string[]> {
    const files = await fs.readdir(CONFIG.outputDir);
    return files.filter(file => file.endsWith('.md'));
}

export async function getCharacters(): Promise<string[]> {
    const files = await fs.readdir(CONFIG.characterDir);
    return files.filter(file => file.endsWith('.json'));
}

export async function getGenerationLogs(): Promise<string[]> {
    const files = await fs.readdir(CONFIG.outputDir);
    return files.filter(file => file.startsWith('generation_log_') && file.endsWith('.json'));
}


export async function readArticleWithFrontMatter(templateName: string): Promise<TemplateContent | null> {
    const filePath = path.join(CONFIG.outputDir, templateName);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data, content } = matter(fileContent);
        return { params: data.params || [], content };
    } catch (error) {
        console.error(`Error reading template ${templateName}:`, error);
        return null;
    }
}

export async function readCharacter(character: string): Promise<any> {
    const filePath = path.join(CONFIG.characterDir, character);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const characterData = JSON.parse(fileContent);
        return characterData
    } catch (error) {
        console.error(`Error reading template ${character}:`, error);
        return null;
    }
}

export async function readGenerationLog(genLog: string): Promise<GenerationLog | null> {
    const filePath = path.join(CONFIG.outputDir, genLog);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const generationData: GenerationLog = JSON.parse(fileContent);
        return generationData
    } catch (error) {
        console.error(`Error reading template ${genLog}:`, error);
        return null;
    }
}


export async function readTemplateWithFrontMatter(templateName: string): Promise<TemplateContent | null> {
    const filePath = path.join(CONFIG.templateDir, templateName);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data, content } = matter(fileContent);
        return { params: data || {}, content };
    } catch (error) {
        console.error(`Error reading template ${templateName}:`, error);
        return null;
    }
}

export async function writeGenerationLog(log: GenerationLog, outputDir: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `generation_log_${timestamp}.json`;
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, JSON.stringify(log, null, 2), 'utf-8');
    return outputPath;
}

export async function writeArticle(content: string, outputDir: string, title?: string): Promise<string> {
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-');

    const frontMatter = {
        title: title || 'Untitled',
        date: now.toISOString(),
        created_at: timestamp
    };

    const fileContent = matter.stringify(content, frontMatter);

    const sanitizedTitle = title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'untitled';
    const filename = `${timestamp}_${sanitizedTitle}.md`;
    const outputPath = path.join(outputDir, filename);

    await fs.writeFile(outputPath, fileContent, 'utf-8');
    return outputPath;
}