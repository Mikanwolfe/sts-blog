export interface ChatCompletionParams {
    siteUrl?: string;
    siteName?: string;
    model?: string;
    messages: { role: string; content: string }[];
  }
  
  export interface TemplateContent {
    params: any;
    content: string;
  }
  
  export interface GenerationLog {
    timestamp: string;
    template: string;
    brief: string;
    userParams: Record<string, string>;
    llmQuestions: string[];
    userAnswers: Record<string, string>;
    title: string;
  }