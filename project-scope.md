# STS Blog Scope Document

28/07/20240 1:11 PM

## Project Overview

Simple templating system blog. I want to be able to specify document type plus some information, and then pass those as params and have them generated. Simple is the goal. No need for template language, just simple and done.

This generates markdown for me to use in a blog. Separate from the build process of 11ty. Template 11ty blog - look for a retro styled one if possible, or a plain one that demonstrates all of the features.

* Main goal: Be able to write blog posts with minimal effort
* Target audience: Me, so things can be a bit more loose without a strict build process
* Problem to solve: Ease of writing a blog. I should be able to write down notes, answer some questions that help make the blog more generic.

#### Answer some questions

This sounds like I'd want some sort of multi-step process. Select a type of blog, and get some questions out. I'd like this step to allow the system to generic-ise the content so that it's more approachable for people. It also forces me to refine the idea.

**Advice:** Ask yourself:

- What is the main goal of this project?
- Who is the target audience?
- What problem does this project solve?

## Must-have features

1. Generation from dot points
2. Template structure - I want to be able to say "explain what a PLC is" and not detail any further
3. Static site generation with 11ty

**Advice:** Consider:

- What features are absolutely necessary for the project to function?
- Which features align directly with the main project goal?
- What features would users expect as a bare minimum?

## Should-have features

1. Retro styling
2. Character voice - be able to speak in a certain way or tone
3. Ease of use in a terminal or via a web app
4. Automated formatting

**Advice:** Think about:

- What features would significantly enhance the project but aren't critical?
- Which features would provide additional value to users?
- What features could be added without significantly increasing development time?

## Could-have features

1. Vector databases and fragments of knowledge
2. Laid out generation templates before generation
3. Image recognition and embedding

**Advice:** Reflect on:

- What "nice-to-have" features could enhance the user experience?
- Are there any innovative features that could set your project apart?
- What features could be easily added in future iterations?

## Won't-have features (for this version)

1. Build pipeline (11ty has nothing to with the templating system for example)
2. A full modular templating language
3. Automated comments

**Advice:** Consider:

- What features are out of scope for the current version?
- Are there any features that might be too complex or time-consuming for this iteration?
- What features could be saved for future versions?

## Technology stack

* Language: JavaScript + Node.js
* Libraries/Frameworks:
  * 11ty (Eleventy): Static site generator for building the blog
    * Styling: Tailwind CSS: Utility-first CSS framework for retro styling
    * Styling: NES.css
  * Inquirer.js: Command-line interface for prompting questions and collecting user input

**Advice:** Ask yourself:

- What language is best suited for this project?
- What libraries or frameworks can help streamline development?
- Are there any specific technical requirements or constraints?

## Development phases

Project Setup and Basic Structure

- Set up the project repository
- Initialize Node.js project and install core dependencies
- Create basic folder structure for 11ty
- Set up a simple 11ty configuration

Content Generation System

- Develop the core logic for generating blog post content from dot points
- Implement template structures for different blog post types
- Create a question-answer system using Inquirer.js for content refinement
- Implement basic content formatting and Markdown generation

CLI Development

- Build a command-line interface using Commander.js
- Integrate the content generation system with the CLI
- Implement commands for selecting blog post types and initiating the generation process

11ty Integration and Styling

- Set up 11ty layouts and includes
- Implement a retro-styled theme using Tailwind CSS
- Configure 11ty to use the generated Markdown files
- Create a basic build process for the static site

Advanced Features and Refinement

- Implement character voice options for content generation
- Develop automated formatting features
- Create a simple web interface for the generation process (if time allows)
- Refine and optimize the content generation algorithms

Testing and Documentation

- Conduct thorough testing of all features
- Write documentation for using the system
- Create example blog posts using the system
- Prepare for deployment and usage

**Advice:** Consider:

- What is the logical order of development tasks?
- How can the project be broken down into manageable phases?
- Are there any dependencies between different phases?

## Additional Notes

**Advice:** Think about:

- Are there any time constraints or deadlines?
- What potential challenges or risks should be noted?
- Are there any specific coding standards or practices to follow?

## Templates and use case

Templates could be:
- Technical tutorials and How To
- Project Showcase/Update
- Industry News
- Problem Solving
- Productivity and Workflow
- Opinion and Editorial
- Code Snippets, Libraries
- Career Development
- Case Studies and Real World Applications
- Tools and Software Reviews
- Hardware and Embedded Systems (more like a category)


### Use Case

Now that we have a few, let's look at the user experience/use case

Menu
- New
- Refine
- Continue

#### New

```
? Select the article type

Select: Opinion

? Briefly describe the goals of the article, and any key points

Input: Brief

? Select related articles for context:

Select: Relevant Article(s)

! Template generated, opening editor

hx <template>

```

The generated template would look something like:

```
YAML Frontmatter
---

Relevant articles:
...


## Heading

Etc etc etc



<! Special template for explaining in depth>


```

#### Refine

Take an existing template and then run it through generation with instructions

```
? Select the article to refine

Select: 2024-07-28-Opinion

? Decribe any sepcial generation instructions

Input: etc etc

! Generating...
! Generated! 

<Some sort of preview>
View it here: http:/......

? Select an option:
- Refine again
- Adjust generation instructions
- Publish

Select: Publish

! Publishing...
! Published to 2024-07-28-Opinion

(Note this just moves it to 11ty)
```