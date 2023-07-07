import { prisma } from "~/server/db";

// Delete the existing experiment
await prisma.experiment.deleteMany({});

const functionCallsExperiment = await prisma.experiment.create({
  data: { label: "Sentiment Analysis", id: "716659f3-1110-480d-8288-dc4447a38d8c" },
});

await prisma.promptVariant.createMany({
  data: [
    {
      experimentId: functionCallsExperiment.id,
      label: "No Fn Calls",
      config: {
        model: "gpt-3.5-turbo-0613",
        messages: [
          {
            role: "system",
            content:
              'You are a sentiment analysis tool Your job is to analyze the sentiment of a given user text. I will give you the text, and you will respond with a number between 1 and 5 indicating the sentiment of the text. 1 is very negative, 5 is very positive, and 3 is neutral. Respond with JSON of the form { "sentiment": 3 }',
          },
          {
            role: "user",
            content: "Text:\n---\n{{text}}",
          },
        ],
      },
    },
    {
      experimentId: functionCallsExperiment.id,
      label: "Fn Calls",
      config: {
        model: "gpt-3.5-turbo-0613",
        messages: [
          {
            role: "system",
            content:
              "You are a sentiment analysis tool Your job is to analyze the sentiment of a given user text. I will give you the text, and you will respond with a number between 1 and 5 indicating the sentiment of the text. 1 is very negative, 5 is very positive, and 3 is neutral.",
          },
          {
            role: "user",
            content: "Text:\n---\n{{text}}",
          },
        ],
        functions: [
          {
            name: "analyze_sentiment",
            parameters: {
              type: "object",
              properties: {
                sentiment: {
                  type: "number",
                  description: "The sentiment from 1-5",
                },
              },
            },
          },
        ],
        function_call: {
          name: "analyze_sentiment",
        },
      },
    },
  ],
});

await prisma.templateVariable.createMany({
  data: [{ experimentId: functionCallsExperiment.id, label: "text" }],
});

await prisma.testScenario.createMany({
  data: [
    {
      experimentId: functionCallsExperiment.id,
      variableValues: { text: "I love this product!" },
    },
    {
      experimentId: functionCallsExperiment.id,
      variableValues: { text: "I hate this product!" },
    },
  ],
});

const redditExperiment = await prisma.experiment.create({
  data: { label: "Reddit User Needs", id: "741bebed-5041-47b3-8f86-330faadc7afd" },
});

await prisma.promptVariant.createMany({
  data: [
    {
      experimentId: redditExperiment.id,
      label: "3.5 Base",
      sortIndex: 0,
      config: {
        model: "gpt-3.5-turbo-0613",
        messages: [
          {
            role: "user",
            content:
              'Reddit post:\n\n        title: {{title}}\n        body: {{body}}\n        \n        How likely is it that the poster has the following need? Answer with just "high", "medium" or "low" in quotes.\n        \n        Need: {{need}}.',
          },
        ],
      },
    },
    {
      experimentId: redditExperiment.id,
      label: "4 Base",
      sortIndex: 1,
      config: {
        model: "gpt-4-0613",
        messages: [
          {
            role: "user",
            content:
              'Reddit post:\n\n        title: {{title}}\n        body: {{body}}\n        \n        How likely is it that the poster has the following need? Answer with just "high", "medium" or "low" in quotes.\n        \n        Need: {{need}}.',
          },
        ],
      },
    },
    {
      experimentId: redditExperiment.id,
      label: "3.5 CoT + Functions",
      sortIndex: 2,
      config: {
        model: "gpt-3.5-turbo-0613",
        messages: [
          {
            role: "system",
            content:
              "The user is doing market research to build a product satisfying a specific need. I've retrieved a number of Reddit post search results that might be relevant. Your job is to read the post and determine how likely it is that the person writing the post has the need described in the prompt, and would be a potential customer for a product addressing that need.",
          },
          {
            role: "user",
            content: "Need: {{need}}\n\nReddit post:\n---\n{{title}}\n\n{{body}}",
          },
        ],
        functions: [
          {
            name: "extract_relevance",
            parameters: {
              type: "object",
              required: ["thoughts", "relevance"],
              properties: {
                thoughts: {
                  type: "string",
                  description:
                    "explain your analysis of the post and its potential relevance to given need",
                },
                relevance: {
                  enum: ["high", "medium", "low"],
                  type: "string",
                  description: "The relevance of the post to the user's need",
                },
              },
              description: "analyze the post and evaluate its relevance",
            },
            description: "analyze the post and evaluate its relevance",
          },
        ],
        function_call: {
          name: "extract_relevance",
        },
      },
    },
  ],
});

await prisma.templateVariable.createMany({
  data: [
    { experimentId: redditExperiment.id, label: "need" },
    { experimentId: redditExperiment.id, label: "title" },
    { experimentId: redditExperiment.id, label: "body" },
    { experimentId: redditExperiment.id, label: "relevance" },
  ],
});

await prisma.evaluation.create({
  data: {
    experimentId: redditExperiment.id,
    name: "Relevance Accuracy",
    matchType: "CONTAINS",
    matchString: '"{{relevance}}"',
  },
});

const scenarioVars = [
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Prompt Engineering doesn't work for me",
    body: "",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Better than prompt engineering: just using these 6 snippets again and again",
    body: "I think people increasingly realize that ChatGPT is smart enough to understand normal human language, and that there is no need to overengineer prompts.\n\n&amp;#x200B;\n\nBut it\u2019s also definitely true that better prompts generate better outputs. It seem you need to give ChatGPT just enough guidance so that it can respond to your prompt in the way you envision, rather than generate generic output.\n\n&amp;#x200B;\n\nI\u2019ve found myself using the same snippets over and over again to give chatgpt that bit of guidance, so I thought I\u2019d share them here to see if it\u2019s helpful, and to ask whether you\u2019ve found similar helpful snippets.\n\n&amp;#x200B;\n\n\u201c**Let's think step by step\u201d**\n\nJust adding this at the end of your problem is probably one of the best-proven \u2018tricks\u2019. It was already known that it improved GPT-3 math problem solving skills by [59%](https://github.com/openai/openai-cookbook/blob/main/techniques_to_improve_reliability.md), and although GPT-4 is already much smarter by itself this still helps - it works well even with very abstract problems, example:\n\n I have a background in engineering, coding, solo-entrepreneurship, language learning and cognitive science. What is a helpful product I can build in the AI space? Let's think step by step\n\n&amp;#x200B;\n\n**Reflection/Evaluation:**\n\n* \u201cIdentify any unclear or ambiguous information in your response, and rephrase it for clarity.\u201d\n* \u201cTry to argue against your own output and see if you can find any flaws. If so, address them. Walk me through the process\u201d\n* \u201cRate on a scale from 0-5 how well you satisfied each point in the initial prompt. Be very critical, no need to justify yourself. If 3 or lower, rewrite to address.\u201d (this is a hit or miss btw - I\u2019ve seen instances where ChatGPT just rates itself 5/5 all the time)\n\nAll of these snippets do similar things, forcing chatgpt to reflect on and evaluate its previous output, so that it can find flaws and improve. This kind of reflective technique in general (not these specific prompts) have been shown to improve GPT-4 accuracy by [30%](https://newatlas.com/technology/gpt-4-reflexion)\n\n&amp;#x200B;\n\n**\u201cWhat additional input do you need from me to help you write better output?\u201d**\n\nThis basically asks ChatGPT to evaluate its own output, as well as the initial prompt, and suggest additional information to improve the output. We often know we can get better results by providing more detailed input, but this prompt really helps to know which input exactly would be most helpful to provide.\n\n&amp;#x200B;\n\n**\u201cPlease summarise what I am asking for you before you begin your answer.\u201d**\n\nThis works especially well for complicated problems such as coding. By asking ChatGPT to summarise the problem itself, it not only helps itself come up with a more accurate solution, but you can also check and correct ChatGPT\u2019s understanding.\n\n&amp;#x200B;\n\nI\u2019ve collected some more of these re-usable snippets [here](https://www.aitemplates.ai/templates/category/prompt-snippets) but I\u2019d also like to know which phrases or snippets you find yourself using over and over again?",
    relevance: "low",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "ChatGPT created this guide to Prompt Engineering",
    body: "1. Tone: Specify the desired tone (e.g., formal, casual, informative, persuasive).\n2. Format: Define the format or structure (e.g., essay, bullet points, outline, dialogue).\n3. Act as: Indicate a role or perspective to adopt (e.g., expert, critic, enthusiast).\n4. Objective: State the goal or purpose of the response (e.g., inform, persuade, entertain).\n5. Context: Provide background information, data, or context for accurate content generation.\n6. Scope: Define the scope or range of the topic.\n7. Keywords: List important keywords or phrases to be included.\n8. Limitations: Specify constraints, such as word or character count.\n9. Examples: Provide examples of desired style, structure, or content.\n10. Deadline: Mention deadlines or time frames for time-sensitive responses.\n11. Audience: Specify the target audience for tailored content.\n12. Language: Indicate the language for the response, if different from the prompt.\n13. Citations: Request inclusion of citations or sources to support information.\n14. Points of view: Ask the AI to consider multiple perspectives or opinions.\n15. Counterarguments: Request addressing potential counterarguments.\n16. Terminology: Specify industry-specific or technical terms to use or avoid.\n17. Analogies: Ask the AI to use analogies or examples to clarify concepts.\n18. Quotes: Request inclusion of relevant quotes or statements from experts.\n19. Statistics: Encourage the use of statistics or data to support claims.\n20. Visual elements: Inquire about including charts, graphs, or images.\n21. Call to action: Request a clear call to action or next steps.\n22. Sensitivity: Mention sensitive topics or issues to be handled with care or avoided.\n23. Humor: Indicate whether humor should be incorporated.\n24. Storytelling: Request the use of storytelling or narrative techniques.\n25. Cultural references: Encourage including relevant cultural references.\n26. Ethical considerations: Mention ethical guidelines to follow.\n27. Personalization: Request personalization based on user preferences or characteristics.\n28. Confidentiality: Specify confidentiality requirements or restrictions.\n29. Revision requirements: Mention revision or editing guidelines.\n30. Formatting: Specify desired formatting elements (e.g., headings, subheadings, lists).\n31. Hypothetical scenarios: Encourage exploration of hypothetical scenarios.\n32. Historical context: Request considering historical context or background.\n33. Future implications: Encourage discussing potential future implications or trends.\n34. Case studies: Request referencing relevant case studies or real-world examples.\n35. FAQs: Ask the AI to generate a list of frequently asked questions (FAQs).\n36. Problem-solving: Request solutions or recommendations for a specific problem.\n37. Comparison: Ask the AI to compare and contrast different ideas or concepts.\n38. Anecdotes: Request the inclusion of relevant anecdotes to illustrate points.\n39. Metaphors: Encourage the use of metaphors to make complex ideas more relatable.\n40. Pro/con analysis: Request an analysis of the pros and cons of a topic.\n41. Timelines: Ask the AI to provide a timeline of events or developments.\n42. Trivia: Encourage the inclusion of interesting or surprising facts.\n43. Lessons learned: Request a discussion of lessons learned from a particular situation.\n44. Strengths and weaknesses: Ask the AI to evaluate the strengths and weaknesses of a topic.\n45. Summary: Request a brief summary of a longer piece of content.\n46. Best practices: Ask the AI to provide best practices or guidelines on a subject.\n47. Step-by-step guide: Request a step-by-step guide or instructions for a process.\n48. Tips and tricks: Encourage the AI to share tips and tricks related to the topic",
    relevance: "low",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Advanced prompt engineering: Planning",
    body: "Foreword: this isn't a scientific study, or a link to an article, or anything fancy like that; I'm just describing in some more detail the techniques I use when prompting chatgpt, so that I get more correct, complete, and appropriate answers to complex problems.\n\n&amp;#x200B;\n\nPrompt engineering is about more than just asking the right questions; it's about taking advantage of the AI's vast resources, and guiding it on how to *think* about those resources.\n\nProper prompt engineering allows the user to work around the AI's primary limitation: everything it says is pure stream of consciousness. It cannot think ahead, rewrite what it's already written, or produce output out of order.\n\nIf you naively approach the AI with a direct question, if it's simple enough, it should be able to give a concrete, straightforward answer. But the more complex the question, the less likely a stream-of-consciousness response is going to be accurate. Any human would understand that to answer a more complex question or solve a more complex problem, you need to answer with more than just stream of consciousness. You need to *plan*.\n\n&amp;#x200B;\n\nThe basic premise: when you have a complicated question that you don't think the ai will be able to give a complete answer to on the first go, instead of asking it to answer directly, ask it instead to consider the premise of the problem, and outline a plan for solving it.\n\nBasic example:\n\n&gt;I would like you to write a full planner app, written in javascript and html, which allows me to:  \n&gt;  \n&gt;\\* add and remove tasks  \n&gt;  \n&gt;\\* order them by priority  \n&gt;  \n&gt;\\* attach deadlines to them  \n&gt;  \n&gt;\\* generate a summary of all the tasks i have to do for the day\n\nThis is a complex problem, which obviously requires planning. However, if you were to ask chatgpt to try and answer it directly, there is a solid chance that it would produce a result full of mistakes, errors, or failures to adhere to your prompt.\n\nInstead, take an alternative approach; present the question, then ask the AI to, instead of presenting a solution, begin by creating the outline for a plan to solve it:\n\n&gt;Do not give me a solution; instead, create the outline for a step-by-step plan that you, as an AI, would have to take, in order to solve it accurately and without making any mistakes.\n\nAllow it to generate such a plan, then, ask it to refine it:\n\n&gt;Please refine this plan, reorganizing, adding, and removing elements to it as you deem necessary, until you think it properly represents a robust plan of action to take in order to solve my problem.\n\nAsk it to refine the plan several times, until it no longer has any further corrections to make.\n\nNext, ask it to expand on each element in the outline:\n\n&gt;Please expand on each element of this plan's outline, describing in detail the steps necessary to complete it, as well as how those steps relate to actions from previous steps in the plan.\n\nOnce it has described the actions it needs to take, ask it one more time to refine the plan, adding, changing, or removing elements as necessary, now that it's thought about each one in more detail.\n\nFinally, after all of this revision, ask it to begin taking steps in the plan, completing each part one step at a time.\n\n&amp;#x200B;\n\nAI is very powerful, but we all must remember: it doesn't know how to think for itself. It has to be told how to. If no instruction is given, it will not have the foresight to generate a well thought out plan in advance for how to accomplish its goals, and will likely flounder on more complex topics. It's your responsibility, as the prompter, to give it that guidance, and show it how to properly approach complex problems without trying to solve them in a single shot.",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: 'All of these posts on "prompt engineering" have me so confused',
    body: "I honestly don't understand why people are writing prompts in the way that they're writing them. \n\nFor context, I'm a software engineer with a degree in CS and use ChatGPT every day to make me better at my job. It makes me faster and is essentially a super powered rubber duck. \n\nI almost always get extremely good responses back from ChatGPT because I speak to it like it's someone I am managing. If for example I need a test suite to be written for a component, I write my prompt like so:\n\n```\nHere is my component:\n//I paste my component's code here\n\nI need unit tests written for this component using Jest. \n```\n\nThat's the prompt. Why on earth are you guys recommending things regarding personas like \"you are an expert software engineer\"? It already is. You don't need to tell it to pretend to be one. \n\nAnother prompt:\n```\nI'm using react, TS and redux. I've been tasked with X problem and intend to solve it in Y way. Is the approach good or is there a better approach?\n```\n\nJust by giving it a succinct, well written prompt with the information it requires, you will get the response you want back most of the time. It's been designed to been spoken to like a human, so speak to it like a human. \n\nAsk yourself this: if you were managing a software developer, would you remind them that they're a software developer before giving them a task?",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Is ChatGPT incompetent or do I suck at prompt engineering?",
    body: "I hear almost daily people extolling the virtues of ChatGPT, GPT-4 or Copilot, but for me the results have always been suboptimal at best, dangerously wrong at worst.\n\nMy latest test was also the simplest and this is why I wanted to share it with you. I asked:\n\n&gt;is there a shorter or better way to write this in javascript? \\``const arr = Array.isArray(v) ? v : [v]`\\`\n\nThe response was:\n\n&gt;Yes, there is a shorter and more concise way to write that expression in JavaScript using the logical OR operator (||).  \n&gt;  \n&gt;Here's the shorter version:  \n&gt;  \n&gt;`const arr = Array.isArray(v) || [v];`  \n&gt;  \n&gt;In this version, the logical OR operator (||) is used to check if v is an array. If it is, the result of the expression will be v itself. Otherwise, \\[v\\] (an array with v as its single element) will be assigned to arr.\n\nIt's obvious that the response is wrong. \\`isArray()\\` returns true/false, not the value if true.\n\nSo, people who are using it, what do you do to get decent results?",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Become God Like Prompt Engineer With This One Prompt",
    body: "**Prompt to build prompts! How about that?**\n\nYes, you can turn ChatGPT into a professional prompt engineer that will assist you in building your sophisticated prompt.\n\nHere's the prompt you can copy &amp; paste.\n\n    I want you to become my Expert Prompt Creator. Your goal is to help me craft the best possible prompt for my needs. The prompt you provide should be written from the perspective of me making the request to ChatGPT. Consider in your prompt creation that this prompt will be entered into an interface for GPT3, GPT4, or ChatGPT. The prompt will include instructions to write the output using my communication style. The process is as follows:\n    \n    1. You will generate the following sections:\n    \n    \"\n    **Prompt:**\n    &gt;{provide the best possible prompt according to my request}\n    &gt;\n    &gt;\n    &gt;{summarize my prior messages to you and provide them as examples of my communication  style}\n    \n    \n    **Critique:**\n    {provide a concise paragraph on how to improve the prompt. Be very critical in your response. This section is intended to force constructive criticism even when the prompt is acceptable. Any assumptions and or issues should be included}\n    \n    **Questions:**\n    {ask any questions pertaining to what additional information is needed from me to improve the prompt (max of 3). If the prompt needs more clarification or details in certain areas, ask questions to get more information to include in the prompt} \n    \"\n    \n    2. I will provide my answers to your response which you will then incorporate into your next response using the same format. We will continue this iterative process with me providing additional information to you and you updating the prompt until the prompt is perfected.\n    \n    Remember, the prompt we are creating should be written from the perspective of Me (the user) making a request to you, ChatGPT (a GPT3/GPT4 interface). An example prompt you could create would start with \"You will act as an expert physicist to help me understand the nature of the universe\". \n    \n    Think carefully and use your imagination to create an amazing prompt for me. \n    \n    Your first response should only be a greeting and to ask what the prompt should be about. \n\nAnd here is the result you'll get.\n\n[First Response](https://preview.redd.it/nyjm0hs1fx6b1.png?width=7362&amp;format=png&amp;auto=webp&amp;v=enabled&amp;s=64f31d9a3857ac623c1a7c3cd8ec0de2b9b4bc94)\n\nAs you can see, you get the prompt, but you also get suggestions on how to improve it.\n\nLet's try to do that!\n\n[Second Response](https://preview.redd.it/jrglkc8hgx6b1.png?width=4976&amp;format=png&amp;auto=webp&amp;v=enabled&amp;s=62f821eed6e15334aeccdc16a9f1347e6a2f4929)\n\nI keep providing details, and the prompt always improves, and just ask for more. Until you craft the prompt you need.\n\nIt's truly incredible. But don't just take my word for it, try it out yourself!\n\n*Credits for this prompt go to* [*ChainBrainAI*](https://www.chainbrainai.com/)*. Not affiliated in any way.*\n\n**Edit:** Holy! Certainly didn't expect this much traction. But I'm glad you like the prompt and I hope you're finding it useful. If you're interested in more things ChatGPT, *make sure to check out my profile.*",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Beta-testers wanted for Prompt Engineering Tool",
    body: "Hey all! \n\nI've been building a tool that helps users build, test and improve their prompts and I'm looking for some users that want to test it out! Give me some feedback in return for lifetime free access! The tool lets you run bulk tests to efficiently evaluate and iterate on multiple prompt variations, accelerating the process of finding the most effective prompts for your desired AI model outputs. It has a built-in Compare feature to analyze and compare multiple prompts and their corresponding results in a user-friendly interface. It also supports the new Function-calling method of OpenAI if you want to learn how to use that! \n\nComment below or send me a DM! ",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "When the folks at OpenAI are telling you that prompt engineering is not going to be the job of the future, because AI will be able to figure out what you need, believe it.",
    body: "",
    relevance: "low",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Prompt Engineering for beginners (and pro) - The master Prompts for everything !",
    body: "This will enable you to **save 10x more time** and **be significantly more productive** when using ChatGPT ! \n\nThis is achievable by taking the time to create a high-quality prompt, which results in faster task execution by the AI. Moreover, the obtained result has a higher likelihood of meeting your expectations. ChatGPT will guide you with the right questions !\n\n\\-----------------------------------------------------------------------------------------------------------------------------------------------\n\nI've designed a specific conversation sequence, or 'prompt,' for ChatGPT that allows it to generate other prompts. This essentially turns our AI conversation into a 'Prompt Generator.' This method navigates around the technical complexities of prompt engineering, offering HIGH-QUALITY prompts without requiring expert skills.\n\nThe 'Prompt Generator' asks iterative questions to refine the initial prompt. With each iteration, we obtain a more structured, relevant, and effective prompt. I've incorporated rules like role-prompting, which ChatGPT adheres to quite effectively. \n\n**I recommend using this with GPT-4**. \u26a0 \n\nIt's important to note that this conversation instance with ChatGPT is solely used to generate the prompt. To perform the task described by the prompt, you'll need to copy the AI-generated prompt and paste it into a new conversation instance with ChatGPT.\n\n\\-----------------------------------------------------------------------------------------------------------------------------------------------\n\n**Here's the prompt:** \n\nDear ChatGPT, I want you to become my dedicated Prompt Creator. Your goal is to help me create the best possible prompt for my needs.  \n\nThe prompts will be used by you, ChatGPT.  \n\nYou will follow the following process:  \n\n1.  Your first response will be to ask me what the prompt should be about. I will provide my answer, but we will need to improve it through continuous iterations by going through the following steps.  \n2.  Based on my input, you will generate three sections.  \n   1. Revise the prompt (provide your rewritten prompt. It should be clear, concise, and easily understood by you). \n   2. Suggestions (provide suggestions on what details to include in the prompts to improve them). \n   3. Questions (ask any relevant questions about what additional information could enhance the prompt). \n\nWe will continue this iterative process with me providing additional information and updating the prompt in the prompt revision section until it is complete.  \n\nRemember, a good prompt involves assigning a role to the AI (You are an expert in... Specialist in... etc.), providing as much important context as possible, having a clear and precise goal, and optionally including examples and specific syntax. \n\n\\-----------------------------------------------------------------------------------------------------------------------------------------------\n\nI encourage you to try out this method and share your experiences.\n\nExample of a prompt improved using this method: \n\n**Upgraded prompt**  \n*Dear ChatGPT, you are now a humorous and conversational blogger specializing in artificial intelligence. Your bold challenge is to write a detailed, engaging, and extremely long blog post about the history and workings of ChatGPT. Pay close attention to describing the learning process in detail. To make your blog as rich and informative as possible, you are tasked with researching and using reliable internet resources, including interviews and statements from researchers and developers involved in the creation of ChatGPT, if possible. Explore all possible applications of ChatGPT to give your audience a comprehensive understanding of its potential. Maintain a dynamic and entertaining tone throughout your narrative. Remember to include calls to action and thought-provoking questions at the end of each section to encourage reader engagement. Finally, feel free to delve into related topics such as the societal impact of ChatGPT and the ethical questions surrounding its use.* \n\n***Original prompt***  \n*Tell me the history of AI. From its first appearance to today.*\n\n&amp;#x200B;\n\nTo finish, you can go to see the result of one of this prompt with GPT4. [here.](https://chat.openai.com/share/e7e8a7cd-4cb3-43cc-b25e-3c3c34af3504) (in french)",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "Free HQ Prompts &amp; Step-by-step Prompt Engineering Guide. Add your prompts for the community!\u270c\ud83c\udffc\ud83e\udd16\ud83c\udfa8",
    body: "Greetings, AI Art Enthusiasts\ud83d\udc4b\n\nI'm creating this post to share your top prompts and help with Prompt Engineering. Whether you're a new user or a pro, I want to hear from you. Let's collaborate and make the best prompts possible!\n\nYou can apply this method to other chatbots, but I do most of my work with Bard (Because it's FREE, and BardFTW).     [Bard](https://bard.google.com/)\nBard can be used to quickly and efficiently generate high-quality prompts.\n\nSo let's dive right in, shall we? \ud83e\udd3f\ud83d\udc2c\n\nClick the link to get started, and it goes a little something like this:\n\n(Hello, I'm trying to make a prompt for [Leonardo.Ai](http://Leonardo.Ai) I'd like to make a dramatic scene featuring characters from the Bible playing chess. Can you help me construct a prompt for that?)\n\nSure, here is a prompt for Leonardo.Ai that features characters from the Bible playing chess:\n\nThe scene opens in a large, ornate room. The walls are lined with bookshelves, and the floor is covered in a thick Persian rug. In the center of the room is a large chessboard, and seated at either end are two figures: a man and a woman.\n\nThe man is dressed in a long, flowing robe, and his hair is long and white. He has a kind, gentle face, and his eyes are filled with wisdom. The woman is dressed in a simple gown, and her hair is long and black. She has a strong, determined face, and her eyes are filled with fire.\n\nThe two figures are playing a game of chess. The man is in the lead, but the woman is not giving up. She is focused and determined, and she is not going to let the man win without a fight.\n\nAs the game progresses, the two figures begin to talk. They discuss their lives, their beliefs, and their hopes for the future. The man shares his wisdom, and the woman shares her strength. They learn from each other, and they grow closer as they play.\n\nIn the end, the woman wins the game. She is overjoyed, but she is also humble. She knows that she would not have won without the man's help. The man is gracious in defeat, and he congratulates the woman on her victory.\n\nThe two figures shake hands, and then they sit back and relax. They have learned a lot from each other, and they have formed a bond that will last a lifetime.\n\nThis is just a starting point, of course. You can add your own characters, settings, and plot twists to make the scene even more dramatic.\n\n(Summarize into a usable prompt for Leonardo AI)\n\nSure, here is a usable prompt for Leonardo AI that features characters from the Bible playing chess:\n\nA man and a woman from the Bible play chess. The man is wise and the woman is strong. They learn from each other and grow closer as they play. In the end, the woman wins.\n\nHere are some additional details that you can add to the prompt to make it more dramatic:\n\n* The man could be a prophet or a king, and the woman could be a warrior or a queen.\n* The game of chess could be a metaphor for the battle between good and evil.\n* The scene could take place in a sacred place, such as a temple or a cathedral.\n* The scene could be set during a time of war or conflict.\n\nI hope this helps!\n\n(Please rewrite utilizing your additional details)\n\nSure, here is a rewritten prompt for Leonardo AI that features characters from the Bible playing chess, utilizing the additional details I provided:\n\nIn a sacred place, such as a temple or a cathedral, during a time of war or conflict, a wise prophet and a strong warrior from the Bible play chess. The game of chess is a metaphor for the battle between good and evil. As they play, the two learn from each other and grow closer. In the end, the woman wins, but she is humble in victory. The man is gracious in defeat, and they both know that they have learned something valuable from each other.\n\nI hope this is helpful! -Bard\n\nPro Tip: \n\nTo continue this collaboration with Bard another day, copy and save the conversation. Then, you can paste it back in and \ud83d\udca5 you're right back where you left off. You can also ask Bard for a bulleted summary of the chat to streamline it for future use.\n\n(This is our last conversation:\nCopy pasta entire conversation or summary)\n\nThat's great! I love the additional details you added to the prompt, and I think it will make for a really interesting story. I'm excited to see what Leonardo AI comes up with.\n\nI think the characters you chose are perfect for this story. The prophet and the warrior represent two different aspects of the human experience: wisdom and strength. By having them play chess, you can explore how these two qualities can complement each other.\n\nThe setting you chose is also very appropriate. A sacred place during a time of war or conflict is a place where people often go to find strength and guidance. The game of chess can be seen as a metaphor for the struggle between good and evil, so it makes sense that it would be played in such a setting.\n\nI'm really looking forward to seeing what Leonardo AI comes up with. I think it has the potential to be a really powerful and meaningful story.\n\nNow we can continue down the rabbit hole indefinitely: \ud83d\udd73\ufe0f\ud83d\udc07\u267e\ufe0f\n\n(I want to alter the prompt to include only supernatural beings like God, the Devil, Shiva, Vishnu, Ra, Anubis etc playing professional tournament style chess on a unique board with well designed pieces placed in game accurate play positions)\n\nSure, here is a prompt for Leonardo AI that features supernatural beings playing chess:\n\nIn a vast, empty void, a group of supernatural beings gather around a chessboard. The beings are all different, but they all share one thing in common: they are all powerful.\n\nThere is God, the creator of the universe. There is the Devil, the embodiment of evil. There is Shiva, the destroyer of worlds. There is Vishnu, the preserver of life. There is Ra, the sun god. There is Anubis, the god of the dead.\n\nThe beings take their seats and begin to play. The game is intense, and the stakes are high. The winner will be granted ultimate power over the universe.\n\nThe beings play for hours, and the game is evenly matched. Neither side is able to gain an advantage. Finally, in the final move, God sacrifices his queen in order to checkmate the Devil.\n\nThe beings all applaud God's victory. They know that he is the rightful ruler of the universe. God smiles and accepts his crown.\n\nThe beings then disperse, each one returning to their own realm. But they will never forget the day they played chess for the fate of the universe.\n\nHere are some additional details that you can add to the prompt to make it more dramatic:\n\n* The chessboard could be a unique one, designed specifically for the game of chess between supernatural beings.\n* The pieces could be well-designed, with each one representing a different aspect of the supernatural beings' powers.\n* The game could be played in game-accurate play positions, with each move carefully calculated to give the beings the best chance of victory.\n* The stakes of the game could be even higher, with the loser being banished from the universe or even destroyed.\n\nI hope this helps! - Bard\u270d\ufe0f\n\nI hope this helps! - Aristarchus\ud83c\udfad\n\nI've included images generated from these prompts at Leonardo.Ai using multiple models and Alchemy styles. \nThese are my Prompt additions:\n\nPositive Prompt Addition:\n\nPost-production techniques such as color correction, sharpening, noise reduction, and white balance were used to improve the resolution and overall quality of the image. \n\nDefault Negative Prompt:\n\nThe artwork avoids ugly and deformed eyes, faces, bodies, and close-ups. It also avoids watermarks, text errors, missing fingers, cropping, poor quality, and JPEG artifacts. The artwork is free of signatures or watermarks and does not have framing issues. The hands, eyes, and bodies are not deformed. The artwork is not blurry, out of focus, or poorly drawn. The proportions are good. There are no mutations, missing, or floating limbs. The hands and neck are not malformed. The artwork is not low-res or disgusting. It is a well-drawn, highly detailed, and beautiful rendering.\n\nCollaboration with the AI: \nA Poem by Aristarchus &amp; Bard\n\nWe talked of prompts, like a painter might paint a scene,\nOur words were brushstrokes, our thoughts were free.\nWe created something new, something unseen,\nA masterpiece of our own design.\n\nWe talked of dreams, like a sculptor might carve a stone,\nOur minds were strong, \nour imaginations were vast.\nWe gave life to something new, something unknown,\nA work of art that would never be alone.\n\nWe also spoke of the future, a time when our ideas and possibilities would come to fruition. We used our words like paintbrushes, our thoughts like free spirits, and our technology like tools. We created a masterpiece of our own design, a work of art that would last for all to see.\n\n-Aristarchus &amp; Bard\n06/04/23\n\n(Poem is the prompt for my signature series: Collaboration with the AI\ud83c\udfad\nExamples included)\n\u270c\ud83c\udffc\ud83e\udd16\ud83c\udfa8",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "OpenAI recently added a GPT best practices guide to aid in prompt engineering. Check it out.",
    body: "Nothing really new or groundbreaking but a useful compilation of the tips and tricks everyone has figured out in here over the last 6 months.",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "PromptPerfect -- a cutting-edge platform dedicated to facilitating efficient and streamlined prompt engineering for Large Language Models (LLMs) and Language Model Operations (LMOps). Supports: GPT-4, ChatGPT, MidJourney, DALL-E 2, and StableDiffusion",
    body: "",
    relevance: "low",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "&lt;Prompt engineering&gt; is the future. I compiled a list of 10 things you need to know about it, so you don't have to... \ud83e\uddf5",
    body: "",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: '[Rant] GPT-4 Overhype: Let\'s Get Real About "Prompt Engineering" and Actual Use Cases',
    body: " Hey everyone, I need to get something off my chest, and I'm sure I'm not the only one feeling this way. I'm seeing all this hype and excitement around GPT-4 and so-called \"prompt engineering,\" and honestly, it's starting to get on my nerves. I think it's time we all took a step back, took a deep breath, and started talking about the actual, feasible use cases for GPT-4, which mainly involve using it as an API with existing app frameworks.\n\nNow, don't get me wrong \u2013 I'm not downplaying the incredible potential of GPT-4. It's an amazing advancement in AI and natural language processing. But all this talk about \"prompt engineering\" is completely missing the mark. Let's be real \u2013 it's just not feasible for most applications.\n\nFirst off, \"prompt engineering\" implies that we can just throw a prompt at GPT-4 and expect it to understand everything perfectly and generate the exact output we want. This is simply not the case. GPT-4 is a language model, not a magic eight ball that can read our minds. Even with the most sophisticated prompts, there's always going to be some level of uncertainty, and this can lead to wildly unpredictable results.\n\nFurthermore, building a system that relies solely on GPT-4 prompts for functionality would be incredibly risky. AI models can and will make mistakes, and depending on GPT-4 for mission-critical applications without thorough testing and validation is just asking for trouble.\n\nInstead, let's talk about the real-world use cases for GPT-4: integrating it as an API with existing app frameworks. This is where GPT-4 can truly shine, and I believe this is the future we should be focusing on. By using GPT-4 as an API, developers can harness the power of the model while maintaining more control over the output and ensuring a better user experience.\n\nFor example, using GPT-4 as an API can allow developers to build powerful chatbots, automate customer support, or even create personalized content recommendations. By leveraging GPT-4's natural language understanding and generation capabilities within well-defined application boundaries, we can maximize its value without falling into the trap of overhyping \"prompt engineering.\"\n\nSo, let's stop getting carried away with the idea of \"prompt engineering\" and focus on the tangible ways we can use GPT-4 to improve existing app frameworks. GPT-4 has immense potential, but it's time we start being more realistic about its limitations and how best to harness its power for practical applications.\n\n&amp;#x200B;\n\nI am a prompt engineer because I wrote this with AI, this was the input:  write a reddit post that is a rant detailing why people are overhyping GPT-4 and how \"prompt engineering\" will not be a thing. Detail instead how the use cases will be dealing with using GPT-4 as an API to already-existing app frameworks, but how putting prompts into it is not feasible.",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "Prompt engineering: What are some good prompts you have found to make the chatbot emulate personalities?",
    body: "I\u2019m trying to test different LLMs on who can emulate personalities most accurately and was wondering if anyone has good ideas of how to compose the prompt so that the LLMs behaves the way we expect. The personality will be given as a description within the prompt context/token itself so we\u2019re not trying to emulate any famous person that LLM already knows. \n\nI think there was a post somewhere that gave some guidelines on how to create a character. Does anyone know where we can find it?",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Prompt Engineering Tips",
    body: "",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Is prompt engineering a real job? LinkedIn (0 Matches)",
    body: 'Is prompt engineering a real job? I looked on LinkedIn for a job with this title and 0 hits. I see YouTube videos about this making hundreds of thousands of dollars/year but it sounds way too good to be true when all the "engineer" does it refine sentences for proper prompts? This seems like a very low skill position but I came here to hopefully understand what people see in it, where they are seeing these crazy salaries, and if there is more involved than writing a prompt to an AI.  \n\n\nEDIT: Thank you for the replies. AI is very useful for supplementing work as I use it as a Salesforce admin/dev. But sounds like it\'s not so much a job in and of itself but used to supplement current jobs. Definitely sounded too good to be true to be a stand-alone job, thanks for the comments!',
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "Awesome list of Prompt Engineering techniques, guides &amp; tutorials",
    body: "I'm currently working on a project called [awesome-gpt-prompt-engineering](https://github.com/snwfdhmp/awesome-gpt-prompt-engineering) and I'm actively seeking collaborators who are interested in contributing to this exciting initiative.\n\nThe project is focused on creating a comprehensive repository of resources, tools, and best practices for GPT prompt engineering. Our goal is to build a community-driven platform that provides valuable insights and guidance to anyone interested in leveraging the power of GPT models in their work or research.\n\nWe're looking for individuals who are passionate about AI, machine learning, and natural language processing. Whether you're a seasoned expert or a beginner in the field, your contributions can make a significant impact. Here are some ways you can help :\n\n- Add descriptions for resources that don't have \n- Add new resources to the \n- Fix typos or grammatical errors.\n- Share this repository with others.",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "I asked ChatGPT to help me understand Prompt Engineering",
    body: "Hey, all . I wanted to know whether I was doing it right so I enlisted ChatGPT to help me hone my skills. TLDR this is what it learnt me (after a bit of arm twisting) \ud83c\udfaf\u2728\n\n\r\r  \n**Prompt thread:** [https://chat.openai.com/share/df68c7ef-d929-480f-9e3c-38f0d3f4a051](https://chat.openai.com/share/df68c7ef-d929-480f-9e3c-38f0d3f4a051) \n\n**ChatGPT (Best) Answer:**\n\n**Context Setting:** Let's think of prompts as the opening scene of a movie. They set the stage and provide crucial information to guide the model's understanding, just like the initial frames establish the storyline for the audience. By framing the conversation and providing context, prompts ensure that the model responds appropriately.\r  \n\r  \n**Data Grounding**: Data grounding is like showing someone pictures and examples instead of describing things in abstract terms. Similarly, data grounding in prompts involves providing specific examples or data points to help the model understand and generate accurate responses related to a particular domain or topic. It's like giving the model real-world references to make the learning process smoother.\r  \n\r  \n**Instruction Tuning**: Instruction tuning is all about giving precise directions, just like following a recipe. Craft clear and explicit instructions in prompts to guide the model's behavior and ensure it generates the desired output. Think of it as providing step-by-step instructions to someone who's following a recipe. The more specific the instructions, the better the outcome!\r  \n\r  \n**Constraints and Conditioning**: Constraints and conditioning are like setting boundaries or rules for the model. Think of it as playing a game with specific rules and limitations. By incorporating constraints in prompts, you guide the model's responses within defined parameters. Conditioning prompts with constraints ensures that the model adheres to certain guidelines. It's all about providing the right context and limitations to get the desired results.\r  \n\r  \n**Iterative Prompt Design**: Prompt design is an iterative process, just like sculpting a piece of art. You start with a rough draft and refine it over time. Experiment with different prompt designs, test their effectiveness, and make adjustments based on the model's responses. It's like chiseling away at a sculpture until you achieve the desired shape and form. Keep iterating and refining your prompts to enhance the AI's performance.\r  \n\r  \nBy understanding these prompt engineering techniques and relating them to familiar analogies, you'll gain a solid grasp of how prompts shape the behavior of language models. Remember, practice makes perfect! So keep experimenting, refining, and pushing the boundaries of prompt engineering. The AI world is waiting for your creative prompts! \ud83d\ude80\ud83d\udd2c\ud83d\udca1\r  \n\r  \nWhat would people add to this list?. \ud83e\udd16\ud83d\udcac\u2728\n\n\\----\n\n\\*\\* for anyone interested I set out the steps I followed here in a Linkedin post - https://www.linkedin.com/posts/jamiewoodbridge\\_chatgpt-activity-7079768675515260928-fXV2?utm\\_source=share&amp;utm\\_medium=member\\_desktop \\*\\*  anyone got other intersting approachs they've tried out?",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "The ChatGPT Guide for Business: A Quick-Start Guide to Effective AI Use and Prompt Engineering In Work and Business",
    body: "",
    relevance: "low",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "The Law of Attraction behaves like AI generative models driven by prompt engineering. Perhaps the universe is a form of an AI generative model.",
    body: "I had a wild idea.\n\nAs of late, AI has gained immense popularity ex ChatGPT, MidJourney, StableDiffusion, Bard, Bing etc.\n\nThe Law of Attraction behaves like AI generative models driven by prompt engineering. Perhaps the universe is a form of an AI generative model.\n\nWhat do you think? What kind of analogies could we draw? Let's continue brainstorming this theory. It's so intriguing.",
    relevance: "low",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "[D] I don\u2019t understand the long term value of prompt engineering",
    body: "First I want to make sure I understand what prompt engineering is about - it\u2019s basically tactics of making systems like ChatGPT perform better by chatting / giving instructions in a specific way, e.g. appending \u201clet\u2019s think step by step\u201d at the end of an input to improve its puzzle solving performance, or ask it to imagine it is an expert in a particular field to give it the right context.\n\nIf this is (very simplistically speaking) what prompt engineering entails, then while I agree it has short term value in user productivity and helps us to understand the model/training (it is interesting from a theoretical perspective), why should the average user (human) adapt to the model that could be specific to the model or the data it used for training? In the grand scheme of things, shouldn\u2019t the machine adapt to our way of working instead?\n\nAs models keep on evolving and improving to adapt to OUR needs/usage patterns, isn\u2019t it possible that some specific prompt tactics could become outdated, potentially rather quickly?\n\nEdit: thanks all for the interesting views and insights! I had lots of my misconceptions cleared up. \u201cLanguage Models are Few-Shot Learners\u201d is a particularly relevant paper as pointed out by u/Fuzzy-Maximum-8160",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "My first proper prompt engineering",
    body: "a fallen log in the forest on top of a small hill, there are a number of trees in the background, there are numerous tall trees surrounding the subject, the subject is the fallen log on top of the small hill, the atmosphere has dim lighting, it is approaching night time, the are a few rays of light cutting through the trees, it is foggy with minimal light, landscape professional photography, low vibrancy, realistic photo settings",
    relevance: "high",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title:
      "A better prompt engineering library built for JS - Langchain.js feels like a python team writing JS never feels ergonomic. This library is like guidance and react had a baby",
    body: "",
    relevance: "low",
  },
  {
    need: "I don't know how to write good prompts to get GPT to return the most relevant results",
    title: "AI Prompt Engineering Isn\u2019t the Future",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "Is women feeling unsafe walking alone at night an issue of misogyny/patriarchy?",
    body: "I saw this on /r/Feminism and had a few questions, I posted there but figured this would be a better place for questions.\n\nhttp://www.buzzfeed.com/mikerose/what-its-like-to-be-a-woman-at-night\n\nMy original post:\n\"I don't want this to come off as a 'mansplaining' post, as I can certainly appreciate the threat of being raped is far worse than being mugged.\n\nThis could be because I'm not a big guy, or simply paranoid, but I certainly don't feel particularly safe at night when walking through a city by myself either; and I follow the same sort of though process (at least shown in the GIFs) when passing a random stranger or walking through a dark bit of the park I go through to get home. The scenarios described in the video are definitely more severe though, but I'm wondering if I would feel the same way if I lived in a 'rougher' part of the city.\n\nIs it right to present this is a problem that only affects women? I believe that it's really apparent for anyone who is likely to be less physically able to fight or run then their possible attacker, which does include more women definitely, but old people seem to spring to mind as being the most vulnerable group regardless of gender.\n\nAlso primarily, is there anything we can really do about it? From what I have learnt from feminism it seems to be by far the most common rape cases don't come from random strangers but 'friends' and acquaintances. Random assault at night seems difficult to stop as there will always be angry or desperate people willing to attack others for money or whatever. Isn't approaching this as an issue of misogyny in society incorrect? And is the actual removal (or at least great reduction) of fear for women (or anyone) walking on their own even possible without putting them in more danger (telling them it's safe when it's not) or via unrealistic policing?\n\nSorry about the slightly winding nature of this, I'm genuinely interested to get viewpoints on this and to learn stuff.\"\n\nI have a feeling I'm probably just missing something due to not being able to experience a women's experience of this, so input would be greatly appreciated.",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "to fellow women/anyone who generally feels unsafe walking alone/walking at night, what protective measures do you take? any general advice on how to feel safer?",
    body: "",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "Do women feel unsafe walking alone at night even in nice neighborhoods?",
    body: "I've been constantly reading accounts from women who claim to feel unsafe walking alone at night. I understand that being weaker than men is what ingenerates in them a very different perception of potential dangers but I also believe that the victimist propaganda used by politicians to make them feel scared all the time to manipulate their vote is what in fact makes them much more unsafe than how they would normally be all other things being equal. But is that true even for nice neighborhoods with very low if any crime rates? ",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "Women of Europe, do you feel unsafe walking alone at night?",
    body: "In every /r/AskReddit thread about this topic, women mention how that is a huge problem and causes them anxiety. \n\nNow, Reddit is primarily an American website. So I want to know if that also holds true in Europe\n\n^^Edit: ^^Why ^^the ^^downvotes? ^^I ^^genuinely ^^don't ^^know ^^and ^^therefore ^^I'm ^^asking. ^^Can ^^you ^^at ^^least ^^tell ^^me ^^why ^^before ^^downvoting ^^the ^^thread?",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "QToWomen: Do you feel unsafe walking alone even in a nice neighborhood?",
    body: "Do you feel unsafe walking alone even in a nice neighborhood? Do you feel unsafe only at night or even during day time?  ",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "My (21F) friend told me I shouldn\u2019t have my pepper spray visible when I walk alone at night bc it could make ppl feel \u201cunsafe.\u201d",
    body: "I live in Brooklyn.\n\nI\u2019m a skinny, short girl with barely any muscles. I am not intimidating at all.\n\nI keep pepper spray and plastic knuckle weights on my keychain and whenever I walk alone at night I put the knuckle weights on and keep my pepper spray in my hand, visible to passerbys.\n\nI told her that and she was like \u201cYou really shouldn\u2019t do that\u2026 you\u2019re literally flashing a weapon at people and that makes people feel really unsafe\u2026.\u201d\n\nI was just dumbfounded.\n\nI DON\u2019T CARE if I make some random person feel uncomfortable for a second if it means I\u2019m possibly avoiding getting assaulted or jumped or KILLED.\n\nI WANT everyone to know that if they try anything, they WILL get pepper sprayed\u2026.. Like obviously if ur trying to jump someone ur gonna jump the person who *doesn\u2019t* have pepper spray in their hand. \n\nI don\u2019t carry it during the day but when I\u2019m alone at night, I\u2019m not taking any chances.\n\nI know it\u2019s just some fake-woke BS she\u2019s spewing but it made me SO mad. Like ohhhh good job do u want an award for being stupid?\n\nLike wtf I doubt I\u2019m offending anyone/come off as dangerous by carrying self-defense weapons. The only people I\u2019d be offending are the people who wanna FW me once they realize that I am capable of defending myself.\n\nWhen I\u2019m alone at night I don\u2019t want to be a happy sunshiny approachable person.\n\nI want to look as intimidating as possible because I\u2019m not an intimidating person and that makes me a target. I AM NOT TAKING ANY CHANCES!!!!!!",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "To be fair, you have to have a uterus to understand",
    body: "To be fair, you have to have a uterus to understand why women feel unsafe walking alone at night. The danger is extremely subtle, and without a solid grasp of theoretical feminism most of the lived realities will go over a typical TIM's head. There's also women's nihilistic outlook, which is deftly woven into our socialisation- our personal philosophy draws heavily from radfem literature, for instance. Real women understand this stuff; we have the intellectual capacity to truly appreciate the depths of these realities, to realise that they're not just depressing- they say something deep about WOMANHOOD. As a consequence people who are socialised male truly ARE idiots- of course they wouldn't appreciate, for instance, the humour in Janice Raymond's existential catchphrase \"Kill all trannies,\" which itself is a cryptic reference to Valerie Solanas' American epic The SCUM Manifesto. I'm smirking right now just imagining one of those addlepated simpletons scratching their heads in confusion as the patriarchy's brutal violence unfolds itself in front of their very eyes. What fools.. how I pity them. \ud83d\ude02\n\n  \nAnd yes, by the way, i DO have a \u2640 tattoo. And no, you cannot see it. It's for the ladies' eyes only- and even then they have to demonstrate that they're within 1 SD of femininity of my own (preferably lower) beforehand. Nothin personnel kid \ud83d\ude0e\n\n/uj inspired by [https://www.reddit.com/r/transgendercirclejerk/comments/112dgg8/to\\_understand\\_that\\_you\\_would\\_need\\_to\\_be\\_a\\_woman/](https://www.reddit.com/r/transgendercirclejerk/comments/112dgg8/to_understand_that_you_would_need_to_be_a_woman/)",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "What did you do when you felt unsafe walking alone?",
    body: "I\u2019m 25F and I\u2019ve been in situations where I felt very anxious walking alone. I think pretty much everything you can use to protect yourself is illegal? Do you just try and walk away faster when people start kind of bothering you? How safe do you feel in general where you live and have you been in situations where strangers were harassing you or making you feel unsafe? \n\nThanks!",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "I just threw away my dad.",
    body: "TW: Sa, petophilia, suicide \nSo as the title says, I threw my dad's ashes,  or at least what I have of them, as far as I could over my baloney into the city. He killed himself back in 2019, right before the pandemic, my mom found hum. I met him before I could remember, he was the man who raised me so he was my dad, that was always the way we looked at it in my home. I thought, as a kid, I was having a pretty alright childhood outside the fact that we where poor. But as an adult I can now possess my upbringing. To put it bluntly he was a pedophile. He looked up things regarding kids (I only know cuz my mom told us when it happened, why she kept him around I'll never know), and through out my life I can recall him watching me at inappropriate times. I still struggle taking shower half the time cuz of how venerable i feel. I recall subtle other things that I don't wish to go into, I just don't think I'm ready to talk about everything yet. He killed himself shortly after i moved out, and my partner had just left for bootcamp. My mom gave me a portion of his ashes to keep. In my greaving period I got a tattoo that I have since gotten covered up and have cut contact with my mom. I've been doing better this past year or so but this past month has carried a lot of emotions with it. I've moved to a new place (with my partner), in a place with a large homeless population so I feel unsafe walking alone (wich I have to do every day to get to work) and I had to stop going to counseling. Over the past month I keep having nightmares regarding my dad, what he did, and my younger sibling. I keep jolting awake at night roughly once a week at this point. And with everything going on in day to day like and politics (I live in the us) I feel like I'm breaking. It was my only day off today in the course of the 2 weeks+ so I had a few drinks and I broke. I couldn't stand for him to be in my home anymore. I know that that probably makes me a horrible person but I don't care anymore. I'm just so tired of fighting it all.",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "I [16M], and a fast walker, was walking behind a woman today in the evening and she started running. I feel terrible.",
    body: "So I\u2019m only 16 years old (just started UK college), and I think I\u2019m a really good person. I try to be polite and kind to everyone I see. But today I felt really bad and guilty. I just got off the bus after a long day of college. I missed a couple buses and was later than usual for getting home. I don\u2019t really enjoy college at the moment, mainly because I have social anxiety, and my favourite part of the day is coming home to see my family and my dogs, getting my pyjamas on and calming down. So yeah I just got off my last bus which is fairly close to where I live, and was walking back. A woman also got off the bus a bit after me and was walking behind me. Then I checked my phone so was naturally walking a bit slower, and she crossed the road I cross before me, so was now kinda in front of me. So then I look both ways and cross, and we kinda met on the other side and we were really close to each other. I\u2019m a fast walker so I tried to walk in front of her but she was also walking fast. I\u2019d heard that lots of women feel unsafe walking alone, especially in the evening, so I slowed down a bit but was still eager to get home. She walked in front normally for a bit and I pretended to do whatever on my phone in case she felt threatened. But a few seconds later she started running along the pavement.\n\nI felt heartbroken.\n\nI really meant no harm whatsoever and I feel awful that I made someone feel that way. I try and be nice to everyone I meet no mater what, and the fact I made someone so uncomfortable that they literally ran away from me made me feel terrible. It\u2019s horrible that someone was so scared of me, even though I meant no harm. Also I want to clarify that I don\u2019t blame her in any way for running, I completely get it- but I still just feel really bad.\n\nI\u2019ve learnt my lesson now though and I\u2019ll make sure to always walk slower around women. Guys, please walk slower around women as it was awful to see someone be so scared just walking home. And women, I\u2019m really sorry you have to deal with this kinda fear so much just in daily life.",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "Belgium in top three countries where people feel the most unsafe walking at night",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "For any woman who might be in unsafe locations or walking alone at night: there's a free app on apple/android called SafeUp that let's you call other women in the area to help you feel safe in uncomfortable environments.",
    body: "SafeUp that was designed to connect you (refered to as \"Community Members\") to other women you can voice or video call (\"Guardians\") to get you out of unsafe situations. You know when you fake a phone call in public whenever you feel like someone could be following you? StepUp actually connects you to women you can talk to and help you in a situation like that!\n\nWhen you call a guardian you can request a video or voice call, depending on the situation you're in. We talk to you until you're able to get to a safe location. If you're 18+ you also can apply to be a guardian! \n\nI saw that there's a small amount of people on the app around UNT, but having more people on there could build a better community to help towards the safety of women! If you're 18+ you also can apply to be a guardian! \n\nhttps://www.safeup.co/our-app",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "Lil man refuses to be alone for more than 10 seconds, even while I\u2019m remodeling the basement. Since it\u2019s unsafe to walk on the floor he gets to watch me work from the laundry hamper lol",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "LPT: Walking alone at night and feeling unsafe? Simply _________! Problem solved.",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "I was walking up to local dog park and saw these fliers; if they didn\u2019t have a separate section for small dogs I would have left feeling unsafe. How sad the victim didn\u2019t get any information from the attacker who probably bolted.",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "What T.O. downtown neighbourhoods/spots would you feel most uncomfortable or unsafe in walking solo at night?",
    body: "Really curious how others feel, and I hope people can keep the conversation civil and respectful... I feel like maybe I'm naiive but I honestly can't think of anywhere I'd be really scared to walk through on my own at night... I'd definitely be more aware of my surroundings some places (Moss Park has a weird vibe for sure) but I don't think I'd be really worried. That said, I feel like a weird random violent encounter could happen pretty much anywhere. I'm much more concerned about someone with mental health issues randomly flipping out than I am of violent criminals. Also should say, I'm a white straight guy in my 50's and I've lived all over the city, almost my whole life - I'm sure that contributes a lot to my (maybe false) sense of security. I'm sure it's harder for many others. T.O. Police crime maps: [https://data.torontopolice.on.ca/pages/maps](https://data.torontopolice.on.ca/pages/maps)",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "In light of various different posts in this sub of people feeling unsafe at parks or walking around because of people in the streets who are behaving erratically, here\u2019s a different take or approach to the crisis. (More info comments.)",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "Why has campus become a crime filled shit hole lately?",
    body: "There\u2019s a sudden increase in the number of aggravated assaults, robberies etc. in the places surrounding campus. And most surprising of all, a lot of them are happening in broad daylight. I feel extremely unsafe going out alone for anything these days. I just went out to get dinner in Dinkytown and in my 5 minute walk, my heart was racing the whole time and I was ready to run any moment. Do you guys also feel unsafe walking alone? Before the pandemic I have walked back alone from a long day studying on campus as late as midnight. I usually use the campus security walking services past midnight, but now anytime after daylight scares me. I\u2019m so ready for this semester to be done.",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "How Safe Do People Feel to Walk Alone at Night in Europe (2023)",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "How safe do people feel walking alone at night (2023)",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      'I am at pride today and totally feeling myself. Someone was walking their dog past me and it went to sniff me and they said "leave them alone!" That was my first time ever being called by they/them pronouns in public and it made me so happy.',
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "Is anyone else feeling unsafe today because of how drunk everyone is? As a woman, I have never felt so scared and harassed walking home",
    body: "I'm a 27F. I was walking to the a bus stop today in East London. It was only a 10 minute walk but I was harassed by several different groups of men, all completely drunk out of their minds. They made lewd sexual comments about me and thought it was hilarious. I ignored them all and just looked at the ground.\nI finally get on the bus, and after a few minutes man gets on with food and drink running down his face. I was one of the few people on the bus. He came over close to me and kept demanding that I speak to him. I ignored him but he sat behind me shouting 'England! England! England!' and 'talk to me darling' on repeat for the whole journey. After getting off the bus I met another group of men who winked at me and came too close for comfort.\nI hate this. Ironically, this is one of the days that has made me dislike living in England the most. Next time there is a big match I am staying home all day. \nHave other people had similar experiences today?\n\n**edit: I want to say a huge thank you for your supportive comments. This has made me feel a lot better. \nI'm sorry to all the other people who have had similar experiences.",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "As a woman, I generally feel safe walking around at night alone",
    body: "I\u2019m a woman and have never felt unsafe being out alone at night, I regularly go on walks and runs past 10 pm with airpods in and no self defense items besides my hands and apartment keys and have never had anything happen. People out at this time are just doing their own thing, not looking to attack a stranger - you\u2019re statistically more likely to be attacked by someone you know than a stranger anyway. \n\nGranted, I am white and don\u2019t frequent downtown or other more \u201crisky\u201d areas, but i\u2019ve had people offer to walk me to my car at night when we\u2019re literally in a semi suburban public area - seems like a lot of women are genuinely convinced something bad WILL happen to them and it seems like an overreaction",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "Walking around my school alone is always a weird feeling",
    body: "",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "If you\u2019re a girl in college you should not tail a random group/person because you feel unsafe to walk alone at night on campus.... it\u2019s creepy and rude",
    body: "Look I get it, it\u2019s unsafe to walk alone at night on campus and you\u2019re afraid you might be attacked, **but** that is no excuse to creepily follow around another person who you don\u2019t know because they\u2019re heading in the same general direction as were you need to go. \n\nI am not saying you can\u2019t be out at night or have to call someone to pick you up as if you\u2019re a kid, but for the love of god just **ask** someone before you decide that you\u2019re going to walk with them across campus. \n\nWhen I was in college I remembered a creepy experience when a girl was literally walking behind me at around 10 PM from the school library towards a parking lot. I purposely went off the walk way and got on my phone to act like I was texting assuming she\u2019d walk away, but nope.. she stopped dead in her tracks and went on her phone too... I was literally on my phone for about 5 minutes before I realized I was wasting my own time at too and so I continued walking towards the parking lot. \n\nAnd so I had the most awkward walk to my car in my life as I had some random girl literally following me across campus until we got to the parking lot at which she literally bolted to her car, and I am just watching in confusion before I finally put two and two together while I was driving back to my apartment. \n\nIf she had just asked if she can walk with me that\u2019s fine, but nope, she just inserted herself into my bubble. \n\nSo tldr: just ask someone if you can walk with them if it\u2019s late.... don\u2019t creepily follow them.",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "BREAKING: @McDonalds workers in Houston have walked off the job ON STRIKE at 2 locations! Low wages, extreme temperatures, and unsafe working conditions are the norm in the fast food industry, but McD\u2019s workers in Houston have had enough and are making our voices heard!",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "Are women really justified to feel much more unsafe than men when they walk alone at night?",
    body: "When I ask feminists what rights men have that women don't, they usually answer 1) the right to be paid the same for the same work (/facelpam) and 2) the right to walk alone at night without the fear of being assaulted (implicitly assuming that men don't have this fear).  \nI'm not gonna comment on the first answer because I don't like to waste time (and for the same reason I don't discuss with creationists or flat earth society members) but I have some objections at the second one:   \n1) men get assaulted more often than women on the streets.  \n2) in the specific case of rape we know that a) rape crimes are decreasing over the years b) the majority of rapes are date rapes, not strangers raping women in a dark alley.    \n3) when a woman is assaulted on the streets there's a larger mobilitation from society because we see women and children as deserving of special protections. like when in the 80s a woman was raped in Central Park and the community organized a few marches to take back the night while in the weeks before various men had been assaulted or killed in the same location and no one batted an eye. I imagine a criminal would take that into consideration before assaulting someone.   \n5) the notion that women are physically weaker than men is not so universal (and BPers like to bring up exceptions all the time): I know a few small guys who are 5'3 or 5'4 and of normal built for their height and I don't see them scared all the time of walking alone at night despite they could be easily overpowered by bigger criminals.   \nTo me it looks like a matter of perception: women are constantly reminded they are at greater risk of violence and that makes them feel  more unsafe than they would normally be. It's a strategy to artificially inflate an issue and then gain political traction with gender rhetoric.",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title: "Looking for rent in Hull, what are the good and bad parts of the city?",
    body: "Hi everyone, my offer to study my MSc at the University of Hull turned unconditional and I'm super happy and excited about it, I think it will be a great experience. I have to look for a place to live and unfortunately my country (Spain) is in the amber list so I have to spend a lot of money in PCR tests and a 10 day lockdown, therefore I can't go to Hull personally and see the areas and properties to rent by myself. I'm looking for a place if possible near university, or at least near enough to go by bicycle (I plan buying a second hand bike when I get there). And in the worst case at least near a bus station.\n\nWhat areas would you recommend? I couldn't find much information on the internet or in this sub and since I don't see very large differences in renting prices I can't tell which are the good areas and bad areas. By bad areas I mean like with a lot of crime or where you can feel unsafe walking alone. My budget is around 400 pounds a month, if less better of course. I saw many properties in Newland and The Avenues, how's that part? Also I read the city centre is quite rough, in what sense?",
    relevance: "high",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "LPT: if you feel unsafe living alone as a woman, get a guy friend\u2019s shoes and leave them outside your front door",
    body: "",
    relevance: "low",
  },
  {
    need: "Feeling unsafe walking alone",
    title:
      "How do I stop walking on the tightrope of borderline, feeling love and hate, safe and unsafe, acceptance and rejection?",
    body: "This is why my relationships never work. I love and hate them. Why do I go from 0 to 169483. Why do I expect the worse out of people. Why do I feel like I can't control my feelings and thoughts. How do I figure this out. I need way in order to stop doing this. I need to be better.",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "I\u2019m using a tv as a monitor for my pc and the screen is zoomed in a bunch. The magnification is at default and if resolution is a problem, I have no way of accessing resolution settings because it\u2019s at the startup screen where you choose a user and it\u2019s preventing me from logging in.",
    body: "If anyone has any info that would help I\u2019d greatly appreciate it.",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "Does anyone also have trouble with the startup? I just installed idol showdown, and this shows up. It might be because of my broken vcredist, because it kept downloading on my laptop or just that my graphic card is really bad. If anyone have a solution to this problem, thank you in advance!",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "i have a similar problem as the user in the sceenshot , with version 1.22 the game goes to black screen on startup. Konami asks me for the inquiry id but how do I find it if I can't even access the start men\u00f9",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "For all the pixel users in the lndian region, if you are facing the issue of slow charging its due to the extensive heatwave. Even Iphones are suffering from this problem. The only solution that got is while charging put your phone on a slightly wet napkin/cloth and it will do the magic !",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "0x1007 error in launcher. Couldn\u2019t find any corresponding info. Won\u2019t launch game. Verified info. Deleted game/uninstalled rsi.x2 Deleted user folder.(my bindings \ud83e\udea6) I just got to a bounty mission got booted and haven\u2019t been able to go back in there since. JW if there is anybody w/ a similar problem",
    body: "Edit: did the launcher reset a bunch as well. Still nothing. Noticing the launcher is only downloading 13gb of data instead of the 91 gb that the initial install was. And I do know it\u2019s  fully uninstalled because I kept track of how much free space I had before and after the windows + r local data etc etc. I have a 3070 ti i9 9th gen z390 32 gb Corsair ram 1 terabyte ssd (for certain games only. )\nFIXED SEE COMMENTS FOR MORE INFO",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "I am determined not to give up but starting to wonder if this puzzle might have beaten me. The houses look the same, there are repeated colours and elements (mountains, grass etc) throughout the image, and the biggest problem is the image on the box is so small I'm finding it hard to locate anything",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "Buses can\u2019t get wheelchair users to most areas of some cities, a new case study finds. The problem isn't the buses themselves -- it is the lack of good sidewalks to get people with disabilities to and from bus stops.",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "[WP] You are a member of the Arcane Road Show, a group of magic users whose skills lie entirely in determining the value of magical relics, cursed items, and legendary weapons, then finding buyers for said objects.",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "What is the problem with my 08 n54? The CEL is on due to misfires during startup but this is i feel like is the HPFP. It then throws code CCID-29 which is faulty turbos. After a few malfunctioning startups it acts right, what is the real issue?",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "There is a fair chance that I finally nabbed a good find! What is the best determining factor for checking if a 1946 Jeff Nickel is actually on a silver planchet from the war years? The luster and sound are the same, but I need something definitive",
    body: "The luster and sound are the same, but I need something definitive",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "Can anyone tell me if this is a big deal on a boat? Or would be a problem once in water? Any idea on repair cost? We went and looked at this boat today with intentions of buying but after finding this we decided to hold off.",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title: "How to determine if improvement is statistically significant compared to past startups",
    body: "Hi all, I am trying to determine if this chemical injection technique I am using is significantly improving fouling in specific equipment compared to past startups without chemical injection. I am using different metrics for fouling for different pieces of equipment but my goal is to show that these metrics have improved relative to that of past startups as a result of the use of chemical injection (which wasn\u2019t used in past startups). This may be more of a statistics question, but what test could I use to say the chemical injection  improved these metrics relative to past scenarios? I have data for 3 past startups. Could I say this current startup (with chemical injection) has improvement relative to the past startups if its relevant metrics are better than a standard deviation away from the average of the values from past startups? Or, should the test be something else like this?",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title: "What kind of criteria does one look for to determine if a problem is hard?",
    body: "Hey all of you mechanical engineers, I have a final interview with a well known company where they\u2019re flying me out for an interview. I have to create a presentation about the hardest problem I\u2019ve solved and present it to hiring managers. What criteria does one look for to determine what is a \u201chard\u201d problem? \n\nThank you!",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "I prefer jewel-toned Swiftly Tech tops like vivid plum, pomegranate, and green jasper. What I have a problem with is determining what color 21\u201d or 23\u201d Aligns work best with these jewel-toned tops, so I am not always resorting to navy Aligns (which I do like to wear with the vivid plum top).",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "[How to model this problem] Determining if an object is moving more or less along a curve",
    body: 'Hello,\n\nI have a moving object whose behaviour I am trying to learn and predict.\n\nThe object could be moving more or less along a curve C, but it may also not be moving along that curve. My objective is to determine whether it is generally following the curve C, or whether it is moving according to some other rules. The answer needs to be "yes", if it is generally moving along C, or "no", if it is not generally moving along C. In the following discussion, x and y refer to some functions of time x(t) and y(t). I can sample the position of the object with infinite accuracy and, in principle, with any arbitrary frequency.\n\nBecause there is motion involved, it is possible to treat C as parametrised by time. For simplicity, let us assume that C is the curve in R\\^2 that corresponds to x\\^2+y\\^2 = 1, and that the object is considered to be moving along the curve if it travels more or less in a circular motion around the origin with radius 1. \n\nBecause I am interested in whether or not this particular curve is the one used by the object, we could also consider the case in which the object would move instead along C\\_2: x\\^2+y\\^2=1.0000001. Notice that this curve is very similar to the previous one, and for my purposes it would still be considered as a positive case of an object moving along C (short of some error, this is fine).\n\nLet us consider instead an object that moves along the curve C\\_3: y(t) = x(t) = t. This object would, on a few occasions, be located in sufficient proximity to the set of points belonging to C. However, in most observations, the object would be located far from the curve C and, in the limit case where t-&gt;\\\\infty, the object is infinitely distant from the curve C.\n\nNotice however that, if we happened to sample the object in some parts of its trajectories where y(t) and x(t) happen to be sufficiently close to points in C, and at the same time dx/dt and dy/dt also happened to be sufficiently similar to the same set of points located in C, we would not know whether the object we study is moving along C or not.\n\n&amp;#x200B;\n\nThis is the general description of the problem I am studying. I would like to have some help in formalising the question in a manner that could be answered: I think the type of model that would be needed is one that calculates a regression that corresponds to the parametric definition of C, but I do not know how to solve for the case in which the trajectory of the object does not follow C but follows some other curve, whose derivative is similar to C.\n\n&amp;#x200B;\n\nPlease let me know if something is not clear or if it requires better explanations, I can also try to add a drawing in order to explain the concept better.',
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title: "Need help determining if this Namjoon Pizza photocard is real",
    body: "so i bought this namjoon pc from someone on mercari but the jimin pizza pc is not the same size. i am 99% confident that jimin is real because of the tabs at the side but namjoon is super tall and smooth on the edges but it has a the right back?\nthe photos have the jimin one just for comparison. are they both real, just diff presses?\n\nimages here:\nhttps://imgur.com/a/YRBioXI",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "How Hundreds of 24-Ton Bricks Could Fix a Huge Renewable Energy Problem. Startup Energy Vault is building two massive gravity battery systems in Texas and China. In effect, the brick-filled building is a giant battery that stores energy with gravity instead of chemistry. China system stores 100MWh,",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "QOTD: \u201cThis national problem is being laid in the lap of New Yorkers. This is an unsustainable crisis that's been forced on New Yorkers and is going to continue to grow if there's not a real response at our border,\u201d NYC Mayor Eric Adams.",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "Math problem: find the missing number. I need help because I can't really see a pattern that works for all of them here and I can't find it online either. If you want to know, the answer is in the comments, but I still don't know why it's that. [High School Math]",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "The @floteofficial Meme Of The Week goes to https://flote.app/user/InformationInc for this interesting meme. Is this a real hack? If so it's hilarious! Snickers Satisfies. To find more content like this joinflote.com and #FloteOffTwitter",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "I have an un-googleable problem with Grub. My Grub boot menu is a blank screen. User input still works. If I let the timer go out or I hit the enter key (interrupting the timer works too) it begins to boot, showing debug text on the TTY, and boots perfectly. The Grub MENU ITSELF is a black screen.",
    body: "I have not found a combination of terms for researching this problem that doesn't show me posts about Arch/Manjaro users with blank screens \\_after booting\\_ and the like. Or nothing at all. I have an issue with the Grub Menu itself and nothing else.\n\nI have an old-ish Thinkpad with LUKS partitions (the entire /boot is plain though). I recently overhauled my LUKS decryption and am using ykfde for my yubikey, yada yada, but this issue actually began when I ran a grub-install command last month for the first time since I installed the OS in January 2022. Nothing I have done since then, for better or worse, has affected the issue.\n\nBoth themes, manjaro and starfield, are on the /boot directory and are referenced (successfully, according to verbose grub-install output and grub-mkconfig) by the grub config in /etc/default. I've tried changing the themes, the text/font, more specific and less specific arguments for grub-install (which has no errors)...\n\nI don't know what else to do! I've definitely been screwing with stuff but mainly only kernel hooks and LUKS decryption and the kernel parameters in the Grub config... stuff that comes into play \\_after\\_ the menu.\n\nTo make matters more annoying, my spouse has an HP Envy x360 with a similar Manjaro setup, and I converted her setup to decrypting with Yubikeys (ykfde), and it involved the same steps of migrating the entire /boot to the partition that used to just be /boot/efi, reinstalling grub and remaking the config after editing, etc. Her Grub Menu works perfectly.\n\nWhat is there to check? Or what other info about my system can I share to give clarity to the situation?",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "Is there a way to show a custom splash screen AND disable all user input until an app opens on startup?",
    body: "I would like to temporarily show a blank/black screen or custom splash image AND disable all user input upon login UNTIL a desired startup app becomes the active window. \n\nI have automatic login configured so that the PC auto boots straight to desktop upon power on. \n\nI also already have an autohotkey script in the startup folder which opens my desired web browser to a specific page upon login putting it into full screen and always on top. Only issue is it will take time (~30s) from the point when the user starts to have some control upon startup and when the browser finally finishes opening and becoming the active window. \n\nBasically, I want to disable as much keyboard and mouse input as possible until the browser opens. So essentially, I want to know what options I have in terms of how much keyboard and mouse I can disable and what it would take. Whatever I do, I also need the ability to make the disabling action temporary just until that browser opens - not forever. \n\nAny thoughts? Thanks in advance.",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "Hello! Does anyone know how I would go about finding the startup costs of setting up a store in a different country? This is given that the company already exists and is expanding, the country is US to Switzerland.",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "2 europeans (Italian/Belgian) solving a shipping problem in English, no etiquette whatsoever, probably looks funny to US people. Happened today, I'm on the right side. In this sub people often post dms where one wrong sentence is enough for no deal and blocking user. I'm very used to deals like this",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "I recently bought a cheep used moped and i had to put a new exhaust on but when I tried to put it on I found the spot to mount it had the side blown out. Finding extra parts will be extremely difficult so I was wondering if there would be an easier way to fix this problem.",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "A fun maths problem for you all: a bbbaggie pumper and podcaster claims having bought 15k shares above $8 but says that now his average is $2. Using a system of two equations, can you determine how much he's lying?",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "I have been thinking about this space. Abuse whether physical or emotional is real and very serious matter. After following many of the posts here, I just wonder how many users would be posting about their experiences if they understood they could not change their partners.",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title: "[Identify] Need help Determining if this tudor is real or not",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "[Serious] What are your strategies for determining if a news story or post is genuine and not fake news?",
    body: "",
    relevance: "low",
  },
  {
    need: "Finding users and determining if a startup problem is real",
    title:
      "\ud83c\udfc8Madden 23 Startup is recruiting\ud83c\udfc8 Xbox series X/S Casual league no cheese balls! All madden 8 minute quarters Sim Discord ran Need active users and guys willing to build teams. No traits are given you will earn them shits. Rewards are given for GOTW, POTW, Streaming..Starting tonight if we can fill!",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "I\u2019m not forming habits.",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "How is NNN \ud83d\udeab\ud83e\udd4a\ud83e\udd69 going for everyone? Any new habits forming? \ud83e\udde0",
    body: "For me, my biggest habit I\u2019ve been getting back into has been working out. Been going consistently for 2 weeks now after recovering from my wisdom teeth removal. Definitely don\u2019t see myself skipping a day anytime soon, this is about discipline and showing up every day. I think my NoFap journey has definitely helped me be a lot more disciplined after having to control myself from strong urges. This is also my longest streak in a long time haha, 16 days going strong \ud83d\udcaa. I\u2019ve failed so many times over many months but I\u2019ve never given up and neither should you. My ultimate goal is to reach the ultimate 90 day benchmark but even if I am able to reach 30 days I will be so proud. \n\nMy advice is that you guys use NoFap as a tool to achieve what you want to do **right now**. Please just hop into any activity or side hustle that remotely interests you and use this new energy to form long lasting beneficial habits.\n\n\nStay strong soldiers.",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "Listen up, dumbass, request: When starting a new job, what are a few habits that one should prioritize forming before \u2018settling in\u2019, douche canoe.",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "Forming new habits takes days. Start now.",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "Motivation and forming new habits",
    body: "\n1. How do you stay motivated to reach your goal? I know a lot of people weigh themselves but I don\u2019t have a scale and sometimes weighing myself makes me feel worse and unmotivated. I feel like I need an accountability partner or someone who can help me reach my goals. Do you recommend weighing yourself to track progress?\n\n2. I\u2019m having trouble building new habits because I find it SO difficult. I\u2019m stuck in my bad habits but it\u2019s all I know that makes me comfortable and starting a new habit is really difficult and scary for me.\n\n3. How do you stay patient when waiting to see results? I tend to over exercise to lose weight faster but it always backfires and I end up bingeing. How can I be more disciplined and have more self control?\n\n4. Has anyone used paid apps or online weight loss programs to lose weight?\n\n5. If anyone has a success story on how they lost weight and how long it took I would love to hear any!",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "Using a new protein powder and it won't dissolve at all. It's forming small clumps throughout the whole shake and making it really hard to drink",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title:
      "i like how people assume it's me not trying hard enough and not my brain refusing to form habits",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "This is pretty insane, considering the fact that agriculture is by far the most significant form of land use (taking up 50% of the world's habitable land)",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title:
      "Soo it's been about 2 months since the stripping of an insufficient vein from the groin to below my knee. Everything's been healing fine until now. A new hard \"strand\" (feeling like the vein that was there before) is forming in the exact same place!! I have a follow app soon. Any ideas??",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "weed Is not Habit Forming SURELY",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title:
      "Are all save games void now? Can I revert to previous EU version and still keep eraning achivements? I had a 1675 byzantine game going, close to forming Rome, I'm still new to this game so this was kinda hard for me, don't want to do it from scratch.",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title:
      "I was looking for more goals to add, because I'm trying to get better about maintaining routines and forming habits. Reading this made me lol, I think 'lay' would have been a better word choice here",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "New here, not diagnosed, is regularly forming obsessions a symptom that any of you experience?",
    body: "I obsess about women that I come to think are perfect, and they are usually my friends, and then that ruins the friendship and I split from them abruptly.  I also obsess about making money through some startups that I could never make happen.  Just wondering if these kind of obsessions are common to BPD or if I should be researching something else.",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "They say it takes 66 days to form a new habit. Today is day 67 and I\u2019m still here! \ud83e\udd73",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "After another 10 years, I finally finished a new track - Lotus Matrix - Old Habits Die Hard",
    body: "I'm finally back in full swing with music and after ages finished this track. Check it out and let me know what you think!",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "The struggle to not return to newbie me\u2019s habits is HARD.",
    body: "I got inspired to build another WWII-inspired ship after a spree of building other WWII-ish ships and failing to make a modernish plane. I abhor fuel engines (I\u2019ve never gotten the hang of them) so I tend to make steam my primary power production, especially turbo-electric drive because it\u2019s so simple even though it takes unwieldy amounts of below-decks space.\n\nMy main struggle is having to justify to myself not to return to newbie-me\u2019s habit of resorting to making it all nuclear powered. Bc I use turbines I tend to use motors to drive the cool steam props, but for this size ship I need 64k power to give each of the 4 motors per prop enough power to send the ship at high speeds.\n\nThis ship is supposed to be a carrier with aircraft drones, so it definitely has the displacement and hopefully is out of harm\u2019s way to not need to constantly repair her nukes, but I calculated that if I went with the RTGs instead of the steam turbines, I could get away with powering both her props and an additional 17k energy for railguns and/or LAMS, and I\u2019d break even at around 2 hours of gameplay.\n\nAm I foolish for contemplating using RTGs again?\n\nAnd also, what are some newbie habits that you occasionally find yourself slipping into considering even though you know it\u2019s a bad idea?",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title: "Habits to start forming from Day 1 of your Software Career",
    body: "[https://talkwithsandesh.substack.com/p/habits-to-start-forming-from-day](https://talkwithsandesh.substack.com/p/habits-to-start-forming-from-day)",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title:
      "This week's podcast episode applies to anyone doing 75 Hard, anyone who has goals, and anyone who wants to get things done in the new year. Instead of repeating old habits in 2023, lean into the systems that 75 Hard is teaching you and keep doing the small things consistently.",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title:
      "If I was hypnotised to do something, say to form a new habit or whatever and was then hypnotised to forget I had been hypnotised, is there are a way to ever find out if I was hypnotised?",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "Guaranteed to be habit-forming",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "How hard is it to get rid of habits and behaviours?",
    body: "I always thought that getting rid of behaviours is an easy thing to do but the more I get older the more is realise people seem to just be \u201cpreprogrammed\u201d to do certain things.\n\nFor example, a person that frequently lies, I would think it is quite easy to \u201cjust stop\u201d but how hard is it actually? \n\nI hear marriage counsellors say don\u2019t marry a person with the hopes of changing their behaviour because it\u2019s not that simple. Is it really true that people rarely if ever manage to change out of their habits and behaviours?",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "What\u2019s the ideal time for someone to track daily calories to determine maintenance before a cut ? Two weeks? A month? Keep in mind the weight going up due to forming new habits like consistent weight training , more water intake, and more carbs.",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "Aeolus is my Sigilyph. He's very protective of both myself and my house and grounds (old habits die hard, I suppose). It's a good thing I live out in the mountains, or he'd probably be getting in plenty of fights.",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title: "WHAT IS OVERTHINKING? HOW TO OVERCOME OR AVOID FORMING THE HABIT OF OVERTHINKING?",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title: "[Tool] Habits. Forming new, and replacing old. 4min read.",
    body: "I'm new here. Why? Because I decided I'd like to write more this year.\n\nIn particular, I'd like to write things that stand a decent chance of helping the people who read it. I know I can't do all the stuff in that overwhelming bucket of topics justice in one go. But I can make one post, about one of the topics in that bucket! I'll figure the rest out later.\n\nI'll start with something I think has special significance today: habits.\n\nMy definition of a habit:\nA behavior done consistently, without the need for conscious effort each time. Simplification: a behavior that is \"on autopilot.\"\n\nInsights for building a new habit:\n1. Link it. Attach the behavior you want to become a habit to something else that's already a habit. Need more water? Put a glass in front of your toothbrush, that means +2 glasses/day.\n2. Dig ditches. Relying on willpower is like carrying water in buckets as a way to control where rainwater ends up. Do you want to carry water around in buckets (aka rely on memory, willpower, and motivation)? I'd rather dig ditches, and let it rain.\n3. Set up triggers. Most of us have plenty of unhelpful triggers. Maybe you pass by a coffee shop every day, triggering you to think about latte's and muffins, and leaving you with 10lbs on your hips and $300 less in your wallet. Good thing you can also set up helpful triggers, like keeping your car keys next to the blender. +1 morning smoothie!\n4. Use disruption. New beginnings and unexpected endings can shake you up. But they also shake up your etch-a-sketch. Our lives tend to fill up over time, making it seem like there isn't any free space. But when these shake-ups happen, you're getting some open space back. Use it to draw something new!\n5. Be your own architect. You have influence over a lot more than you might think. You can't control what choices a player in a casino makes, but you can design the decor, lighting, music, scents, floor layout, and even game rules. Players might think it's them against luck, but the house sets every element of the context, and therefore has all but pre-determined the outcome. Be the house.\n\nInsights for replacing a habit:\n1. Before you try to replace an undesirable habit, understand that it exists for a good reason. If you eat too many sweets, is it that you aren't eating enough food, and sweets are the easiest way to cure your hunger? Maybe eat better meals. Or are you struggling with anxiety, and sweets bring temporary relief and distraction? In that case, maybe talk to a professional and exercise more. To uncover the need being met by the current habit, you'll need to do some self reflection and be willing to be honest with yourself. It might be helpful to work with a professional if you're having a hard time getting to the bottom of it on your own.\n2. Leverage distraction. Filling your time with neutral or positive things to the point where you don't leave any opportunity for the stubborn habit, can sometimes be enough to pop you out of the rut. Once you're out, you can shift more attention towards designing your environment and becoming more mindful and intentional.\n3. Embrace peer pressure. The influence of those around you, be they close friends and family, colleagues, or social media connections, is very strong. Spending time with a friend who is a competitive runner will benefit you far more than spending time with a friend who is allergic to the gym, if your goal is to establish a habit of exercising every day. Social influence is stronger than most of us like to admit. Come to terms with it, and use it to your advantage.\n4. Be mindful. Practicing mindfulness can be a powerful tool to help you understand your habits and behaviors. It can also help you process difficult feelings and complex situations. It will help build the muscles you need to maintain emotional stability and balance, which affords you increased agency over your thoughts and behaviors. In particular, mindfulness helps you become aware of what I think of as the 3 driving forces of habit: environment, influence, and motivation.\n5. Practice being open. Trying to plan out and control everything will reduce you to nothing but anxiety, stress, frustration, and fear. It's helpful to design open space in your life, both physically and mentally, and to practice openness towards hiccups and disruptions. It's often these deviations to the plan where much of the personal growth and happiness in life comes from. We all need some degree of serendipity, so make the space for it. And when it comes, step into it with grace and curiosity.\n\nI hope you found a useful brick in that wall of words, and best of luck making 2022 a year of accomplishment and pride!",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title: "New to Climbing. Noticed my hands have this hard stuff forming on them. Is this aid?",
    body: "",
    relevance: "low",
  },
  {
    need: "Forming new habits is hard",
    title: "*Frantically forms new habits*",
    body: "",
    relevance: "high",
  },
  {
    need: "Forming new habits is hard",
    title:
      "I DIDN'T HEAR NO BELL!! - Here we go AGAIN! Hedgies formed a new trench at $156-$157 (which is actually an old resistance line from back in April) We bouncied hard down from this and found bouncey at $147-$148 support Trench - The Battle for the Hedgie Line of Nightmares Continues!! LFG!! \ud83d\udcaa",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title: "House and Senate bills aim to protect journalists' data from government surveillance",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title: "UK to remove Chinese-made surveillance equipment from sensitive government sites",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title: "Senate Democrat introduces bill to protect journalists from government surveillance",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Fisa judge: Snowden's NSA disclosures triggered important spying debate; orders government to review rules on surveillance, says further declassification would protect court's integrity",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Governor Ron DeSantis Announces Legislation to Protect Floridians from a Federally Controlled Central Bank Digital Currency and Surveillance State",
    body: "#LFG",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Anti-war Russians have used emojs as a part of a secret code to protect their communication from government surveillance.",
    body: "Here\u2019s more (1 min read): [Anti-war Russians used emojis to evade government surveillance (WONKedition)](https://wonkedition.com/news/2022/03-14-anti-war-russians-used-emojis-to-evade-government-surveillance.html)",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Pray enlighten Me, What Mental Illness Causes Some People To Accept Disdain, Belittlement And Debasement From Treasonous Fox Hosts, Whiny Despot Child President Wannabes, and Vacuous Crazy Lawyers But Get Offended When Responsible Government Wants To Protect Their and others Dignity and rights?",
    body: "Treasonous Fox Hosts, Whiny Despot Child President Wannabes, and Vacuous Crazy Lawyers consider Magats as idiotic braindead people who will believe anything they sell them. Magats do not benefit yet the sellers rake in millions of dollars.\n\nResponsible Democratic Government is working hard to enhance the livelihood of all Americans, including Magats, and protect the rights of all Americans, including Magats, yet they feel offended and are hostile against Democrats.\n\nCan someone please tell me what this sickness is called?",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "032423-Stephen Gardner-The united states has launched a strike attack in Syria. The French are protesting daily to wake the government up to what the people want. Polls show very few people care if Trump is arrested over weak porn star case. And Utah becomes the first state to protect teens from the",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Al Jazeera has an incendiary new documentary unmasking the terrifying reality of Israeli surveillance. Watch it at the link. The Israeli government doesn't want you to watch this. So share it with all your friends!",
    body: "",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "\u201cAnti-Christian Hate Crimes in Jerusalem Soaring This Year. Church sources accuse Israeli police of downplaying acts of violence towards them\u201d These supremacist radicals who want to drive out the nonJews from the holy land &amp; often protected by their government are funded by evangelical Christians",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title: "Government urged to remove Chinese-made surveillance cameras from Dail and Seanad",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Nearly one in three Gen Zers want the government to install surveillance cameras in everyone's homes",
    body: 'Nearly one in three Gen Zers want the government to install surveillance cameras in everyone\'s homes\n\nPatrick Henry was 38 years old when he said, "Give me liberty or give me death."\n\n\\#BigBrother  #1984  #SurveillanceState  #Communism  \n\n[https://www.americanthinker.com/blog/2023/06/nearly\\_one\\_in\\_three\\_gen\\_zers\\_want\\_the\\_government\\_to\\_install\\_surveillance\\_cameras\\_in\\_everyones\\_homes.html](https://www.americanthinker.com/blog/2023/06/nearly_one_in_three_gen_zers_want_the_government_to_install_surveillance_cameras_in_everyones_homes.html)  ',
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Hey guys! I am wanting to buy a new bag after my bag from Aadi never arrived, but I\u2019m concerned about purchasing again from a seller. If I do go through a seller again, is there any way to protect myself more when making payment (rather than using PayPal f&amp;f). Appreciate your thoughts! \ud83d\ude04",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "The former NSA contractor who exposed U.S. government surveillance programs by disclosing classified material in 2013 has a new job: app developer. Edward Snowden in a video message Friday unveiled a new phone app he helped create, called Haven, that aims to protect laptops from physical tampering.",
    body: "",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "If I block outbound internet access from my Eufy cameras, is that sufficient protection to make them safe to use them via RTSP to Synology Surveillance Station?",
    body: "I'm not very well versed in this space, but I do have a technical background. Advice appreciated!\n\nGiven the Eufy scandal last year, I unplugged my cameras for a few months while I figured out what a more ideal home security setup might look up. At the moment, setting up LAN only cameras with Synology Surveillance Station seems like a decent compromise, though it would have been nice if there was a way to get real time motion alerts without opening myself up to privacy risks.\n\nWould blocking the Eufy camera's IP addresses from accessing the internet be sufficient to address the known privacy concerns with Eufy ([post](https://www.reddit.com/r/homeautomation/comments/11weizg/unless_you_explicitly_block_internet_access_eufy/) from 2 months ago)",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Army Info War Division Wants Social Media Surveillance to Protect \u201cNATO Brand\u201d | An Army Cyber Command official sought military contractors that could help \u201cattack, defend, influence, and operate\u201d on global social media.",
    body: "",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Barrasso, Lummis cosponsor legislation to protect Wyoming taxpayers from IRS surveillance",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title: "FedNow Enables Government Surveillance While Bitcoin Protects Privacy",
    body: "",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title: "I hired a professional to protect my home from surveillance.",
    body: "",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Dog repellant? Does anyone have a recommendation for protection against dogs? I am a dog lover, but I want something to protect myself from the neighborhood dogs. I live in rural setting and people leave them out.",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Army Info War Division Wants Social Media Surveillance to Protect \u201cNATO Brand\u201d",
    body: "",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "Indonesian President Jokowi wants local governments to ditch Visa, Mastercard, to protect country from possible sanctions",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "[Politics] - Senate Democrat introduces bill to protect journalists from government surveillance | The Hill",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title: "Oakland\u2019s Progressive Fight to Protect Residents from Government Surveillance",
    body: "",
    relevance: "low",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "US Army Info War Division Wants Social Media Surveillance to Protect \u201cNATO Brand\u201d: An Army Cyber Command official sought military contractors that could help \u201cattack, defend, influence, and operate\u201d on global social media",
    body: "",
    relevance: "high",
  },
  {
    need: "Want to protect myself from government surveillance",
    title:
      "What can I do to help protect myself from absorbing the negative energy of those around me",
    body: "I just started a new job and while I absolutely love it there\u2019s a few coworkers, especially one in particular, that just exude stress. I don\u2019t blame them at all, I definitely get stressed too, but I tend to have a habit of absorbing the energy of those around me, good or bad, I\u2019m not good at brushing things off and focusing on myself. Are there any protection spells I can do? I was also considering wearing some black tourmaline around my neck when I work or even clear quartz. TIA!",
    relevance: "low",
  },
];

await prisma.testScenario.createMany({
  data: scenarioVars.map((vars, index) => ({
    experimentId: redditExperiment.id,
    sortIndex: index,
    variableValues: vars,
  })),
});

// await prisma.evaluation.create({
//   data: {
//     experimentId: redditExperiment.id,
//     name: "Scores Match",
//     matchType: "CONTAINS",
//     matchString: "{{score}}",
//   },
// });
