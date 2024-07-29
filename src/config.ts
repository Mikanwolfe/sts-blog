import path from 'path';

export const CONFIG = {
  templateDir: path.join(process.cwd(), 'templates'),
  outputDir: path.join(process.cwd(), 'generated'),
  completeDir: path.join(process.cwd(), 'completed'),
  characterDir: path.join(process.cwd(), 'characters'),
  defaultModel: 'mistralai/mixtral-8x22b-instruct',
  defaultEditor: 'hx'
};