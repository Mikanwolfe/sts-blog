# Simple Templating System - Blog

> I want to write a blog, but I don't have the time. There's industry knowledge I wish to share. Here's how I want to do it. Let's prove the dead internet theory wrong!

The motivation behind this system is to create a simple way to translate technical information into blog posts. In a way, it's to provide human-friendly padding to technical information to make it easy to read and digest. I imagine that it's easier for an LLM to explain a basic concept (such as subnets) as an aside in a blog post than myself. I want to focus on the main ideas and content.

I also want to write good blogs, so there should be a lot of human touch-points within the system. 
As a result, this is an experiment to play with using LLMs and "Templates". Not templates in the original sense, but "hey <LLM> use this template <template> to incorporate these points <points>" all within a single call. Hence the "Simple" part. This is representative of how I normally use LLMs.


## Getting Started

Run the following:

 - `git clone <this repo>`
 - `npm install`
 - `npm run start`

The start script simply runs `ts-node src/index.ts`.


## Usage

Follow the prompts - files will eb generated in the folders `completed` and `generated`.
You'll also want to provide an OpenRouter API key in `.env`:

```
# .env
OPENROUTER_API_KEY=YOUR_API_KEY_HERE
```

## Development

This repo is actively being worked on (probably). See `project-scope.md` for more information.