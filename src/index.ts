#!/usr/bin/env node

import dotenv from 'dotenv';
import { mainMenu } from './userInteractions';
import { newArticle, refineArticle, regenerateArticle, publishArticle, listStatus } from './articleManagement';

async function main() {
  dotenv.config();
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not found in .env');
    process.exit(1);
  }

  try {
    while (true) {
      const action = await mainMenu();
      
      switch (action) {
        case 'new': await newArticle(); break;
        case 'refine': await refineArticle(); break;
        case 'regenerate': await regenerateArticle(); break;
        case 'publish': await publishArticle(); break;
        case 'status': await listStatus(); break;
        case 'exit': 
          console.log("Goodbye!");
          return;
      }
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();