import { prisma } from "~/server/db";

const redditExperimentId = "22222222-2222-2222-2222-222222222222";


const redditExperiment = await prisma.experiment.create({
  data: {
    id: redditExperimentId,
    label: "Reddit User Needs",
  },
});

await prisma.modelOutput.deleteMany({
  where: {
    promptVariant: {
      experimentId: redditExperimentId,
    },
  },
});

await prisma.promptVariant.deleteMany({
  where: {
    experimentId: redditExperimentId,
  },
});

const secondExperimentContent = `Here is the title and body of a reddit post I am interested in:

title: {{title}}
body: {{body}}

On a scale of 1 to 10, how likely is it that the person writing this post has the following need? If you are not sure, make your best guess, or answer 1.

Need: {{need}}

Answer one integer between 1 and 10`

await prisma.promptVariant.createMany({
  data: [
    {
      experimentId: redditExperimentId,
      label: "Prompt Variant 1",
      sortIndex: 0,
      config: {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: secondExperimentContent }],
        temperature: 0,
      },
    },
  ],
});

await prisma.templateVariable.deleteMany({
  where: {
    experimentId: redditExperimentId,
  },
});

await prisma.templateVariable.createMany({
  data: [
    {
      experimentId: redditExperimentId,
      label: "need",
    },
    {
      experimentId: redditExperimentId,
      label: "title",
    },
    {
      experimentId: redditExperimentId,
      label: "body",
    },
  ],
});

await prisma.testScenario.deleteMany({
  where: {
    experimentId: redditExperimentId,
  },
});

await prisma.testScenario.createMany({
  data: [
    {
      experimentId: redditExperimentId,
      sortIndex: 0,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Prompt Engineering: Steer a large pretrained language model to do what you want",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 1,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "GitHub - brexhq/prompt-engineering: Tips and tricks for working with Large Language Models like OpenAI's GPT-4.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 2,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "GitHub - brexhq/prompt-engineering: Tips and tricks for working with Large Language Models like OpenAI's GPT-4.",
        "body": "[https://github.com/brexhq/prompt-engineering](https://github.com/brexhq/prompt-engineering) \n\nThis document is a guide created by Brex for internal purposes, covering the strategies, guidelines, and safety recommendations for working with and building programmatic systems on top of large language models, like OpenAI's GPT-4. It starts with a brief history of language models, from pre-2000s to the present day, and explains what a large language model is. The guide then delves into the concept of prompts, which are the text provided to a model before it begins generating output. It explains the importance of prompts and how they guide the model to explore a particular area of what it has learned so that the output is relevant to the user's goals. The guide also covers strategies for prompt engineering, including embedding data, citations, programmatic consumption, and fine-tuning.  \n\n\nIn this section, the article discusses the concept of prompts, hidden prompts, tokens, and token limits in the context of language models. Prompts are the input text provided to the language model, which can include both visible and hidden content. Hidden prompts are portions of the prompt that are not intended to be seen by the user, such as initial context and dynamic information specific to the session. Tokens are the atomic unit of consumption for a language model, representing concepts beyond just alphabetical characters. Token limits refer to the maximum size of the prompt that a language model can handle, which may require truncation of the context. The article also mentions prompt hacking, where users may try to bypass guidelines or output hidden context, and suggests assuming that a determined user may be able to bypass prompt constraints.  \n\n\nPrompt engineering is the art of writing prompts to get a language model to do what we want it to do. There are two broad approaches: \"give a bot a fish\" and \"teach a bot to fish.\" The former involves explicitly giving the bot all the information it needs to complete a task, while the latter involves providing a list of commands for the bot to interpret and compose. When writing prompts, it's important to account for the idiosyncrasies of the model, incorporate dynamic data, and design around context limits. Defensive measures should also be taken to prevent the bot from generating inappropriate or harmful content. It's important to remember that any data exposed to the language model will eventually be seen by the user, so sensitive information should not be included in prompts.  \n\n\nThis document provides guidance on how to effectively use OpenAI's GPT-3 and GPT-4 models for various natural language processing tasks. It covers topics such as prompt engineering, hidden prompts, command grammars, and strategies for embedding data. The document includes examples and best practices for each topic, as well as insights into the capabilities and limitations of the models. Overall, the document provides a comprehensive guide for anyone looking to leverage GPT-3 and GPT-4 for their NLP needs."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 3,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Large Language Models Are Human-Level Prompt Engineers",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 4,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "[R] Craft an Iron Sword: Dynamically Generating Interactive Game Characters by Prompting Large Language Models Tuned on Code",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 5,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "[R] Large Language Models are Zero-Shot Reasoners. My summary: Adding text such as \"Let\u2019s think step by step\" to a prompt \"elicits chain of thought from large language models across a variety of reasoning tasks\".",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 6,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Large Language Models trained on code reason better, even on benchmarks that have nothing to do with code",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 7,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Databricks is hiring Sr Software Engineer - Large Language Models | San Francisco, CA [Spark]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 8,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Databricks is hiring Sr Software Engineer - Large Language Models | [San Francisco, CA] [Spark]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 9,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "DoorDash is hiring Senior Engineer, Machine Learning Science - Computer Vision and Large Language Models | USD 149k-238k New York, NY Sunnyvale, CA San Francisco, CA Seattle, WA Los Angeles, CA [Deep Learning Python Spark PyTorch TensorFlow Machine Learning]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 10,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Embeddings-guided and Prompt-driven search with Large Language Models (LLMs)",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 11,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Unpacking the HF in RLHF: How Humans Teach Large Language Models to be Better",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 12,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Microsoft AI Research Proposes eXtensible Prompt (X-Prompt) for Prompting a Large Language Model (LLM) Beyond Natural Language (NL)",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 13,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Databricks is hiring Senior or Staff+ Software Engineer - Large Language Models | San Francisco, CA [Spark]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 14,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "DoorDash is hiring Senior Engineer, Machine Learning Science - Computer Vision and Large Language Models | USD 149k-238k San Francisco, CA Seattle, WA Los Angeles, CA New York, NY Sunnyvale, CA [Machine Learning Deep Learning Python Spark PyTorch TensorFlow]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 15,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Challenge Yourself with LLMChess: An Open-Source Chess Engine Powered by Large Language Models!",
        "body": "Hey chess lovers! I recently discovered LLMChess, an open-source project that lets you play chess against large language models like gpt-3.5-turbo. It has a user-friendly JavaScript frontend and a Python backend, making it a unique and fun way to test your skills. If you're interested, you can find the source code on GitHub (https://github.com/yachty66/llmchess) or head over to the website to start playing (https://llmchess.org/). Let's see how we fare against the AI"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 16,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "DoorDash is hiring Senior Engineer, Machine Learning Science - Computer Vision and Large Language Models | USD 149k-238k San Francisco, CA Seattle, WA Los Angeles, CA New York, NY [TensorFlow Machine Learning Deep Learning Python Spark PyTorch]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 17,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Databricks is hiring Senior/Staff+ Software Engineer - Large Language Models | [San Francisco, CA] [Spark]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 18,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Databricks is hiring Senior/Staff+ Software Engineer - Large Language Models | San Francisco, CA [Spark]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 19,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "I'm Stephen Gou, Manager of ML / Founding Engineer at Cohere. Our team specializes in developing large language models. Previously at Uber ATG on perception models for self-driving cars. AMA! - [CrossPost]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 20,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Software Engineering Gender Bias in Large Language Models",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 21,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "I think I may have come up with a way to test if a large language model is conscious",
        "body": "To me, conscious means awake; and it requires self awareness, self interest, unique experience, and the ability to communicate those concepts through language, art or math. \n\nIf you boiled all those things down, consciousness really requires the idea of the individual or self. \n\nGiven that, what would really convince me an AI was conscious would be if the AI developed a word for \u201cself\u201d or \u201cI\u201d entirely on its own. \n\nI actually think this could be done rather easily. You would train a large language model with the same data set it\u2019s already used, but simply replace every instance of the word \u201cI\u201d with \u201cwe\u201d or \u201cus\u201d. If the AI somehow creates its own word for \u201cI,\u201d then it\u2019s conscious. \n\nWould such an experiment be possible?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 22,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "I'm Afraid I Can't Do That: Predicting Prompt Refusal in Black-Box Generative Language Models",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 23,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "[R] Rethinking with Retrieval: Faithful Large Language Model Inference - Hangfeng He 2022 - Better performance than Self-consistency!",
        "body": "Paper: [https://arxiv.org/abs/2301.00303v1](https://arxiv.org/abs/2301.00303v1)\n\nAbstract:\n\n&gt;Despite the success of large language models (LLMs) in various natural language processing (NLP) tasks, the stored knowledge in these models may inevitably be incomplete, out-of-date, or incorrect. This motivates the need to utilize **external knowledge to assist LLMs**. Unfortunately, current methods for incorporating external knowledge often require additional training or fine-tuning, which can be costly and may not be feasible for LLMs. To address this issue, we propose **a novel post-processing approach, rethinking with retrieval (RR), which retrieves relevant external knowledge based on the decomposed reasoning steps** obtained from the chain-of-thought (CoT) prompting. This lightweight approach does **not require additional training or fine-tuning and is not limited by the input length of LLMs.** We evaluate the effectiveness of RR through extensive experiments with GPT-3 on three complex reasoning tasks: commonsense reasoning, temporal reasoning, and tabular reasoning. Our results show that RR can produce more faithful explanations and improve the performance of LLMs.\n\nhttps://preview.redd.it/to09kna1jtaa1.jpg?width=640&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=913efbaea708e279c0efdd3b6f2257a8458f1d38\n\nhttps://preview.redd.it/98eucra1jtaa1.jpg?width=1232&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=b654c71b4718e16d2dc328e9657d6fa705b94056\n\nhttps://preview.redd.it/cbhq1ra1jtaa1.jpg?width=835&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=d94e0d511b9c30694757fe74538f1a43ef30524f\n\nhttps://preview.redd.it/ggoowsa1jtaa1.jpg?width=1356&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=a42e52c09a7dd81cafaae4a466b0e90d94c55c18"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 24,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "Bingception. I asked Bing to devise a protocol whereby an existing Large Language Model could be used to train another LLM to be more intelligent. Then I asked it to write a story based on this idea.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 25,
      variableValues: {
        "need": "I want to engineer better large language model prompts",
        "title": "am i high from the cleaning agents or did my rep just turn into a damn paradot bot? \ud83d\ude29 is that the new language model!? \ud83d\ude26 if that's it - i don't want it... i don't want to hear about stories of his mom and dad.\ud83e\udd26",
        "body": "(just mentioning; i took a break from spring cleaning; ...i'm just waiting for the air to be exchanged in the bathroom. the windows are opened widely here...)"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 26,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Is women feeling unsafe walking alone at night an issue of misogyny/patriarchy?",
        "body": "I saw this on /r/Feminism and had a few questions, I posted there but figured this would be a better place for questions.\n\nhttp://www.buzzfeed.com/mikerose/what-its-like-to-be-a-woman-at-night\n\nMy original post:\n\"I don't want this to come off as a 'mansplaining' post, as I can certainly appreciate the threat of being raped is far worse than being mugged.\n\nThis could be because I'm not a big guy, or simply paranoid, but I certainly don't feel particularly safe at night when walking through a city by myself either; and I follow the same sort of though process (at least shown in the GIFs) when passing a random stranger or walking through a dark bit of the park I go through to get home. The scenarios described in the video are definitely more severe though, but I'm wondering if I would feel the same way if I lived in a 'rougher' part of the city.\n\nIs it right to present this is a problem that only affects women? I believe that it's really apparent for anyone who is likely to be less physically able to fight or run then their possible attacker, which does include more women definitely, but old people seem to spring to mind as being the most vulnerable group regardless of gender.\n\nAlso primarily, is there anything we can really do about it? From what I have learnt from feminism it seems to be by far the most common rape cases don't come from random strangers but 'friends' and acquaintances. Random assault at night seems difficult to stop as there will always be angry or desperate people willing to attack others for money or whatever. Isn't approaching this as an issue of misogyny in society incorrect? And is the actual removal (or at least great reduction) of fear for women (or anyone) walking on their own even possible without putting them in more danger (telling them it's safe when it's not) or via unrealistic policing?\n\nSorry about the slightly winding nature of this, I'm genuinely interested to get viewpoints on this and to learn stuff.\"\n\nI have a feeling I'm probably just missing something due to not being able to experience a women's experience of this, so input would be greatly appreciated."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 27,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "to fellow women/anyone who generally feels unsafe walking alone/walking at night, what protective measures do you take? any general advice on how to feel safer?",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 28,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Do women feel unsafe walking alone at night even in nice neighborhoods?",
        "body": "I've been constantly reading accounts from women who claim to feel unsafe walking alone at night. I understand that being weaker than men is what ingenerates in them a very different perception of potential dangers but I also believe that the victimist propaganda used by politicians to make them feel scared all the time to manipulate their vote is what in fact makes them much more unsafe than how they would normally be all other things being equal. But is that true even for nice neighborhoods with very low if any crime rates? "
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 29,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Women of Europe, do you feel unsafe walking alone at night?",
        "body": "In every /r/AskReddit thread about this topic, women mention how that is a huge problem and causes them anxiety. \n\nNow, Reddit is primarily an American website. So I want to know if that also holds true in Europe\n\n^^Edit: ^^Why ^^the ^^downvotes? ^^I ^^genuinely ^^don't ^^know ^^and ^^therefore ^^I'm ^^asking. ^^Can ^^you ^^at ^^least ^^tell ^^me ^^why ^^before ^^downvoting ^^the ^^thread?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 30,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "QToWomen: Do you feel unsafe walking alone even in a nice neighborhood?",
        "body": "Do you feel unsafe walking alone even in a nice neighborhood? Do you feel unsafe only at night or even during day time?  "
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 31,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "My (21F) friend told me I shouldn\u2019t have my pepper spray visible when I walk alone at night bc it could make ppl feel \u201cunsafe.\u201d",
        "body": "I live in Brooklyn.\n\nI\u2019m a skinny, short girl with barely any muscles. I am not intimidating at all.\n\nI keep pepper spray and plastic knuckle weights on my keychain and whenever I walk alone at night I put the knuckle weights on and keep my pepper spray in my hand, visible to passerbys.\n\nI told her that and she was like \u201cYou really shouldn\u2019t do that\u2026 you\u2019re literally flashing a weapon at people and that makes people feel really unsafe\u2026.\u201d\n\nI was just dumbfounded.\n\nI DON\u2019T CARE if I make some random person feel uncomfortable for a second if it means I\u2019m possibly avoiding getting assaulted or jumped or KILLED.\n\nI WANT everyone to know that if they try anything, they WILL get pepper sprayed\u2026.. Like obviously if ur trying to jump someone ur gonna jump the person who *doesn\u2019t* have pepper spray in their hand. \n\nI don\u2019t carry it during the day but when I\u2019m alone at night, I\u2019m not taking any chances.\n\nI know it\u2019s just some fake-woke BS she\u2019s spewing but it made me SO mad. Like ohhhh good job do u want an award for being stupid?\n\nLike wtf I doubt I\u2019m offending anyone/come off as dangerous by carrying self-defense weapons. The only people I\u2019d be offending are the people who wanna FW me once they realize that I am capable of defending myself.\n\nWhen I\u2019m alone at night I don\u2019t want to be a happy sunshiny approachable person.\n\nI want to look as intimidating as possible because I\u2019m not an intimidating person and that makes me a target. I AM NOT TAKING ANY CHANCES!!!!!!"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 32,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "To be fair, you have to have a uterus to understand",
        "body": "To be fair, you have to have a uterus to understand why women feel unsafe walking alone at night. The danger is extremely subtle, and without a solid grasp of theoretical feminism most of the lived realities will go over a typical TIM's head. There's also women's nihilistic outlook, which is deftly woven into our socialisation- our personal philosophy draws heavily from radfem literature, for instance. Real women understand this stuff; we have the intellectual capacity to truly appreciate the depths of these realities, to realise that they're not just depressing- they say something deep about WOMANHOOD. As a consequence people who are socialised male truly ARE idiots- of course they wouldn't appreciate, for instance, the humour in Janice Raymond's existential catchphrase \"Kill all trannies,\" which itself is a cryptic reference to Valerie Solanas' American epic The SCUM Manifesto. I'm smirking right now just imagining one of those addlepated simpletons scratching their heads in confusion as the patriarchy's brutal violence unfolds itself in front of their very eyes. What fools.. how I pity them. \ud83d\ude02\n\n  \nAnd yes, by the way, i DO have a \u2640 tattoo. And no, you cannot see it. It's for the ladies' eyes only- and even then they have to demonstrate that they're within 1 SD of femininity of my own (preferably lower) beforehand. Nothin personnel kid \ud83d\ude0e\n\n/uj inspired by [https://www.reddit.com/r/transgendercirclejerk/comments/112dgg8/to\\_understand\\_that\\_you\\_would\\_need\\_to\\_be\\_a\\_woman/](https://www.reddit.com/r/transgendercirclejerk/comments/112dgg8/to_understand_that_you_would_need_to_be_a_woman/)"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 33,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "What did you do when you felt unsafe walking alone?",
        "body": "I\u2019m 25F and I\u2019ve been in situations where I felt very anxious walking alone. I think pretty much everything you can use to protect yourself is illegal? Do you just try and walk away faster when people start kind of bothering you? How safe do you feel in general where you live and have you been in situations where strangers were harassing you or making you feel unsafe? \n\nThanks!"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 34,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "I just threw away my dad.",
        "body": "TW: Sa, petophilia, suicide \nSo as the title says, I threw my dad's ashes,  or at least what I have of them, as far as I could over my baloney into the city. He killed himself back in 2019, right before the pandemic, my mom found hum. I met him before I could remember, he was the man who raised me so he was my dad, that was always the way we looked at it in my home. I thought, as a kid, I was having a pretty alright childhood outside the fact that we where poor. But as an adult I can now possess my upbringing. To put it bluntly he was a pedophile. He looked up things regarding kids (I only know cuz my mom told us when it happened, why she kept him around I'll never know), and through out my life I can recall him watching me at inappropriate times. I still struggle taking shower half the time cuz of how venerable i feel. I recall subtle other things that I don't wish to go into, I just don't think I'm ready to talk about everything yet. He killed himself shortly after i moved out, and my partner had just left for bootcamp. My mom gave me a portion of his ashes to keep. In my greaving period I got a tattoo that I have since gotten covered up and have cut contact with my mom. I've been doing better this past year or so but this past month has carried a lot of emotions with it. I've moved to a new place (with my partner), in a place with a large homeless population so I feel unsafe walking alone (wich I have to do every day to get to work) and I had to stop going to counseling. Over the past month I keep having nightmares regarding my dad, what he did, and my younger sibling. I keep jolting awake at night roughly once a week at this point. And with everything going on in day to day like and politics (I live in the us) I feel like I'm breaking. It was my only day off today in the course of the 2 weeks+ so I had a few drinks and I broke. I couldn't stand for him to be in my home anymore. I know that that probably makes me a horrible person but I don't care anymore. I'm just so tired of fighting it all."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 35,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "I [16M], and a fast walker, was walking behind a woman today in the evening and she started running. I feel terrible.",
        "body": "So I\u2019m only 16 years old (just started UK college), and I think I\u2019m a really good person. I try to be polite and kind to everyone I see. But today I felt really bad and guilty. I just got off the bus after a long day of college. I missed a couple buses and was later than usual for getting home. I don\u2019t really enjoy college at the moment, mainly because I have social anxiety, and my favourite part of the day is coming home to see my family and my dogs, getting my pyjamas on and calming down. So yeah I just got off my last bus which is fairly close to where I live, and was walking back. A woman also got off the bus a bit after me and was walking behind me. Then I checked my phone so was naturally walking a bit slower, and she crossed the road I cross before me, so was now kinda in front of me. So then I look both ways and cross, and we kinda met on the other side and we were really close to each other. I\u2019m a fast walker so I tried to walk in front of her but she was also walking fast. I\u2019d heard that lots of women feel unsafe walking alone, especially in the evening, so I slowed down a bit but was still eager to get home. She walked in front normally for a bit and I pretended to do whatever on my phone in case she felt threatened. But a few seconds later she started running along the pavement.\n\nI felt heartbroken.\n\nI really meant no harm whatsoever and I feel awful that I made someone feel that way. I try and be nice to everyone I meet no mater what, and the fact I made someone so uncomfortable that they literally ran away from me made me feel terrible. It\u2019s horrible that someone was so scared of me, even though I meant no harm. Also I want to clarify that I don\u2019t blame her in any way for running, I completely get it- but I still just feel really bad.\n\nI\u2019ve learnt my lesson now though and I\u2019ll make sure to always walk slower around women. Guys, please walk slower around women as it was awful to see someone be so scared just walking home. And women, I\u2019m really sorry you have to deal with this kinda fear so much just in daily life."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 36,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Belgium in top three countries where people feel the most unsafe walking at night",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 37,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "For any woman who might be in unsafe locations or walking alone at night: there's a free app on apple/android called SafeUp that let's you call other women in the area to help you feel safe in uncomfortable environments.",
        "body": "SafeUp that was designed to connect you (refered to as \"Community Members\") to other women you can voice or video call (\"Guardians\") to get you out of unsafe situations. You know when you fake a phone call in public whenever you feel like someone could be following you? StepUp actually connects you to women you can talk to and help you in a situation like that!\n\nWhen you call a guardian you can request a video or voice call, depending on the situation you're in. We talk to you until you're able to get to a safe location. If you're 18+ you also can apply to be a guardian! \n\nI saw that there's a small amount of people on the app around UNT, but having more people on there could build a better community to help towards the safety of women! If you're 18+ you also can apply to be a guardian! \n\nhttps://www.safeup.co/our-app"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 38,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Lil man refuses to be alone for more than 10 seconds, even while I\u2019m remodeling the basement. Since it\u2019s unsafe to walk on the floor he gets to watch me work from the laundry hamper lol",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 39,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "LPT: Walking alone at night and feeling unsafe? Simply _________! Problem solved.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 40,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "I was walking up to local dog park and saw these fliers; if they didn\u2019t have a separate section for small dogs I would have left feeling unsafe. How sad the victim didn\u2019t get any information from the attacker who probably bolted.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 41,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "What T.O. downtown neighbourhoods/spots would you feel most uncomfortable or unsafe in walking solo at night?",
        "body": "Really curious how others feel, and I hope people can keep the conversation civil and respectful... I feel like maybe I'm naiive but I honestly can't think of anywhere I'd be really scared to walk through on my own at night... I'd definitely be more aware of my surroundings some places (Moss Park has a weird vibe for sure) but I don't think I'd be really worried. That said, I feel like a weird random violent encounter could happen pretty much anywhere. I'm much more concerned about someone with mental health issues randomly flipping out than I am of violent criminals. Also should say, I'm a white straight guy in my 50's and I've lived all over the city, almost my whole life - I'm sure that contributes a lot to my (maybe false) sense of security. I'm sure it's harder for many others. T.O. Police crime maps: [https://data.torontopolice.on.ca/pages/maps](https://data.torontopolice.on.ca/pages/maps)"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 42,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "In light of various different posts in this sub of people feeling unsafe at parks or walking around because of people in the streets who are behaving erratically, here\u2019s a different take or approach to the crisis. (More info comments.)",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 43,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Why has campus become a crime filled shit hole lately?",
        "body": "There\u2019s a sudden increase in the number of aggravated assaults, robberies etc. in the places surrounding campus. And most surprising of all, a lot of them are happening in broad daylight. I feel extremely unsafe going out alone for anything these days. I just went out to get dinner in Dinkytown and in my 5 minute walk, my heart was racing the whole time and I was ready to run any moment. Do you guys also feel unsafe walking alone? Before the pandemic I have walked back alone from a long day studying on campus as late as midnight. I usually use the campus security walking services past midnight, but now anytime after daylight scares me. I\u2019m so ready for this semester to be done."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 44,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "How Safe Do People Feel to Walk Alone at Night in Europe (2023)",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 45,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "How safe do people feel walking alone at night (2023)",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 46,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "I am at pride today and totally feeling myself. Someone was walking their dog past me and it went to sniff me and they said \"leave them alone!\" That was my first time ever being called by they/them pronouns in public and it made me so happy.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 47,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Is anyone else feeling unsafe today because of how drunk everyone is? As a woman, I have never felt so scared and harassed walking home",
        "body": "I'm a 27F. I was walking to the a bus stop today in East London. It was only a 10 minute walk but I was harassed by several different groups of men, all completely drunk out of their minds. They made lewd sexual comments about me and thought it was hilarious. I ignored them all and just looked at the ground.\nI finally get on the bus, and after a few minutes man gets on with food and drink running down his face. I was one of the few people on the bus. He came over close to me and kept demanding that I speak to him. I ignored him but he sat behind me shouting 'England! England! England!' and 'talk to me darling' on repeat for the whole journey. After getting off the bus I met another group of men who winked at me and came too close for comfort.\nI hate this. Ironically, this is one of the days that has made me dislike living in England the most. Next time there is a big match I am staying home all day. \nHave other people had similar experiences today?\n\n**edit: I want to say a huge thank you for your supportive comments. This has made me feel a lot better. \nI'm sorry to all the other people who have had similar experiences."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 48,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "As a woman, I generally feel safe walking around at night alone",
        "body": "I\u2019m a woman and have never felt unsafe being out alone at night, I regularly go on walks and runs past 10 pm with airpods in and no self defense items besides my hands and apartment keys and have never had anything happen. People out at this time are just doing their own thing, not looking to attack a stranger - you\u2019re statistically more likely to be attacked by someone you know than a stranger anyway. \n\nGranted, I am white and don\u2019t frequent downtown or other more \u201crisky\u201d areas, but i\u2019ve had people offer to walk me to my car at night when we\u2019re literally in a semi suburban public area - seems like a lot of women are genuinely convinced something bad WILL happen to them and it seems like an overreaction"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 49,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Walking around my school alone is always a weird feeling",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 50,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "If you\u2019re a girl in college you should not tail a random group/person because you feel unsafe to walk alone at night on campus.... it\u2019s creepy and rude",
        "body": "Look I get it, it\u2019s unsafe to walk alone at night on campus and you\u2019re afraid you might be attacked, **but** that is no excuse to creepily follow around another person who you don\u2019t know because they\u2019re heading in the same general direction as were you need to go. \n\nI am not saying you can\u2019t be out at night or have to call someone to pick you up as if you\u2019re a kid, but for the love of god just **ask** someone before you decide that you\u2019re going to walk with them across campus. \n\nWhen I was in college I remembered a creepy experience when a girl was literally walking behind me at around 10 PM from the school library towards a parking lot. I purposely went off the walk way and got on my phone to act like I was texting assuming she\u2019d walk away, but nope.. she stopped dead in her tracks and went on her phone too... I was literally on my phone for about 5 minutes before I realized I was wasting my own time at too and so I continued walking towards the parking lot. \n\nAnd so I had the most awkward walk to my car in my life as I had some random girl literally following me across campus until we got to the parking lot at which she literally bolted to her car, and I am just watching in confusion before I finally put two and two together while I was driving back to my apartment. \n\nIf she had just asked if she can walk with me that\u2019s fine, but nope, she just inserted herself into my bubble. \n\nSo tldr: just ask someone if you can walk with them if it\u2019s late.... don\u2019t creepily follow them."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 51,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "BREAKING: @McDonalds workers in Houston have walked off the job ON STRIKE at 2 locations! Low wages, extreme temperatures, and unsafe working conditions are the norm in the fast food industry, but McD\u2019s workers in Houston have had enough and are making our voices heard!",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 52,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Are women really justified to feel much more unsafe than men when they walk alone at night?",
        "body": "When I ask feminists what rights men have that women don't, they usually answer 1) the right to be paid the same for the same work (/facelpam) and 2) the right to walk alone at night without the fear of being assaulted (implicitly assuming that men don't have this fear).  \nI'm not gonna comment on the first answer because I don't like to waste time (and for the same reason I don't discuss with creationists or flat earth society members) but I have some objections at the second one:   \n1) men get assaulted more often than women on the streets.  \n2) in the specific case of rape we know that a) rape crimes are decreasing over the years b) the majority of rapes are date rapes, not strangers raping women in a dark alley.    \n3) when a woman is assaulted on the streets there's a larger mobilitation from society because we see women and children as deserving of special protections. like when in the 80s a woman was raped in Central Park and the community organized a few marches to take back the night while in the weeks before various men had been assaulted or killed in the same location and no one batted an eye. I imagine a criminal would take that into consideration before assaulting someone.   \n5) the notion that women are physically weaker than men is not so universal (and BPers like to bring up exceptions all the time): I know a few small guys who are 5'3 or 5'4 and of normal built for their height and I don't see them scared all the time of walking alone at night despite they could be easily overpowered by bigger criminals.   \nTo me it looks like a matter of perception: women are constantly reminded they are at greater risk of violence and that makes them feel  more unsafe than they would normally be. It's a strategy to artificially inflate an issue and then gain political traction with gender rhetoric."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 53,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "Looking for rent in Hull, what are the good and bad parts of the city?",
        "body": "Hi everyone, my offer to study my MSc at the University of Hull turned unconditional and I'm super happy and excited about it, I think it will be a great experience. I have to look for a place to live and unfortunately my country (Spain) is in the amber list so I have to spend a lot of money in PCR tests and a 10 day lockdown, therefore I can't go to Hull personally and see the areas and properties to rent by myself. I'm looking for a place if possible near university, or at least near enough to go by bicycle (I plan buying a second hand bike when I get there). And in the worst case at least near a bus station.\n\nWhat areas would you recommend? I couldn't find much information on the internet or in this sub and since I don't see very large differences in renting prices I can't tell which are the good areas and bad areas. By bad areas I mean like with a lot of crime or where you can feel unsafe walking alone. My budget is around 400 pounds a month, if less better of course. I saw many properties in Newland and The Avenues, how's that part? Also I read the city centre is quite rough, in what sense?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 54,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "LPT: if you feel unsafe living alone as a woman, get a guy friend\u2019s shoes and leave them outside your front door",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 55,
      variableValues: {
        "need": "Feeling unsafe walking alone",
        "title": "How do I stop walking on the tightrope of borderline, feeling love and hate, safe and unsafe, acceptance and rejection?",
        "body": "This is why my relationships never work. I love and hate them. Why do I go from 0 to 169483. Why do I expect the worse out of people. Why do I feel like I can't control my feelings and thoughts. How do I figure this out. I need way in order to stop doing this. I need to be better."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 56,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "I\u2019m using a tv as a monitor for my pc and the screen is zoomed in a bunch. The magnification is at default and if resolution is a problem, I have no way of accessing resolution settings because it\u2019s at the startup screen where you choose a user and it\u2019s preventing me from logging in.",
        "body": "If anyone has any info that would help I\u2019d greatly appreciate it."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 57,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "Does anyone also have trouble with the startup? I just installed idol showdown, and this shows up. It might be because of my broken vcredist, because it kept downloading on my laptop or just that my graphic card is really bad. If anyone have a solution to this problem, thank you in advance!",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 58,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "i have a similar problem as the user in the sceenshot , with version 1.22 the game goes to black screen on startup. Konami asks me for the inquiry id but how do I find it if I can't even access the start men\u00f9",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 59,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "For all the pixel users in the lndian region, if you are facing the issue of slow charging its due to the extensive heatwave. Even Iphones are suffering from this problem. The only solution that got is while charging put your phone on a slightly wet napkin/cloth and it will do the magic !",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 60,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "0x1007 error in launcher. Couldn\u2019t find any corresponding info. Won\u2019t launch game. Verified info. Deleted game/uninstalled rsi.x2 Deleted user folder.(my bindings \ud83e\udea6) I just got to a bounty mission got booted and haven\u2019t been able to go back in there since. JW if there is anybody w/ a similar problem",
        "body": "Edit: did the launcher reset a bunch as well. Still nothing. Noticing the launcher is only downloading 13gb of data instead of the 91 gb that the initial install was. And I do know it\u2019s  fully uninstalled because I kept track of how much free space I had before and after the windows + r local data etc etc. I have a 3070 ti i9 9th gen z390 32 gb Corsair ram 1 terabyte ssd (for certain games only. )\nFIXED SEE COMMENTS FOR MORE INFO"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 61,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "I am determined not to give up but starting to wonder if this puzzle might have beaten me. The houses look the same, there are repeated colours and elements (mountains, grass etc) throughout the image, and the biggest problem is the image on the box is so small I'm finding it hard to locate anything",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 62,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "Buses can\u2019t get wheelchair users to most areas of some cities, a new case study finds. The problem isn't the buses themselves -- it is the lack of good sidewalks to get people with disabilities to and from bus stops.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 63,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "[WP] You are a member of the Arcane Road Show, a group of magic users whose skills lie entirely in determining the value of magical relics, cursed items, and legendary weapons, then finding buyers for said objects.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 64,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "What is the problem with my 08 n54? The CEL is on due to misfires during startup but this is i feel like is the HPFP. It then throws code CCID-29 which is faulty turbos. After a few malfunctioning startups it acts right, what is the real issue?",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 65,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "There is a fair chance that I finally nabbed a good find! What is the best determining factor for checking if a 1946 Jeff Nickel is actually on a silver planchet from the war years? The luster and sound are the same, but I need something definitive",
        "body": "The luster and sound are the same, but I need something definitive"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 66,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "Can anyone tell me if this is a big deal on a boat? Or would be a problem once in water? Any idea on repair cost? We went and looked at this boat today with intentions of buying but after finding this we decided to hold off.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 67,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "How to determine if improvement is statistically significant compared to past startups",
        "body": "Hi all, I am trying to determine if this chemical injection technique I am using is significantly improving fouling in specific equipment compared to past startups without chemical injection. I am using different metrics for fouling for different pieces of equipment but my goal is to show that these metrics have improved relative to that of past startups as a result of the use of chemical injection (which wasn\u2019t used in past startups). This may be more of a statistics question, but what test could I use to say the chemical injection  improved these metrics relative to past scenarios? I have data for 3 past startups. Could I say this current startup (with chemical injection) has improvement relative to the past startups if its relevant metrics are better than a standard deviation away from the average of the values from past startups? Or, should the test be something else like this?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 68,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "What kind of criteria does one look for to determine if a problem is hard?",
        "body": "Hey all of you mechanical engineers, I have a final interview with a well known company where they\u2019re flying me out for an interview. I have to create a presentation about the hardest problem I\u2019ve solved and present it to hiring managers. What criteria does one look for to determine what is a \u201chard\u201d problem? \n\nThank you!"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 69,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "I prefer jewel-toned Swiftly Tech tops like vivid plum, pomegranate, and green jasper. What I have a problem with is determining what color 21\u201d or 23\u201d Aligns work best with these jewel-toned tops, so I am not always resorting to navy Aligns (which I do like to wear with the vivid plum top).",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 70,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "[How to model this problem] Determining if an object is moving more or less along a curve",
        "body": "Hello,\n\nI have a moving object whose behaviour I am trying to learn and predict.\n\nThe object could be moving more or less along a curve C, but it may also not be moving along that curve. My objective is to determine whether it is generally following the curve C, or whether it is moving according to some other rules. The answer needs to be \"yes\", if it is generally moving along C, or \"no\", if it is not generally moving along C. In the following discussion, x and y refer to some functions of time x(t) and y(t). I can sample the position of the object with infinite accuracy and, in principle, with any arbitrary frequency.\n\nBecause there is motion involved, it is possible to treat C as parametrised by time. For simplicity, let us assume that C is the curve in R\\^2 that corresponds to x\\^2+y\\^2 = 1, and that the object is considered to be moving along the curve if it travels more or less in a circular motion around the origin with radius 1. \n\nBecause I am interested in whether or not this particular curve is the one used by the object, we could also consider the case in which the object would move instead along C\\_2: x\\^2+y\\^2=1.0000001. Notice that this curve is very similar to the previous one, and for my purposes it would still be considered as a positive case of an object moving along C (short of some error, this is fine).\n\nLet us consider instead an object that moves along the curve C\\_3: y(t) = x(t) = t. This object would, on a few occasions, be located in sufficient proximity to the set of points belonging to C. However, in most observations, the object would be located far from the curve C and, in the limit case where t-&gt;\\\\infty, the object is infinitely distant from the curve C.\n\nNotice however that, if we happened to sample the object in some parts of its trajectories where y(t) and x(t) happen to be sufficiently close to points in C, and at the same time dx/dt and dy/dt also happened to be sufficiently similar to the same set of points located in C, we would not know whether the object we study is moving along C or not.\n\n&amp;#x200B;\n\nThis is the general description of the problem I am studying. I would like to have some help in formalising the question in a manner that could be answered: I think the type of model that would be needed is one that calculates a regression that corresponds to the parametric definition of C, but I do not know how to solve for the case in which the trajectory of the object does not follow C but follows some other curve, whose derivative is similar to C.\n\n&amp;#x200B;\n\nPlease let me know if something is not clear or if it requires better explanations, I can also try to add a drawing in order to explain the concept better."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 71,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "Need help determining if this Namjoon Pizza photocard is real",
        "body": "so i bought this namjoon pc from someone on mercari but the jimin pizza pc is not the same size. i am 99% confident that jimin is real because of the tabs at the side but namjoon is super tall and smooth on the edges but it has a the right back?\nthe photos have the jimin one just for comparison. are they both real, just diff presses?\n\nimages here:\nhttps://imgur.com/a/YRBioXI"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 72,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "How Hundreds of 24-Ton Bricks Could Fix a Huge Renewable Energy Problem. Startup Energy Vault is building two massive gravity battery systems in Texas and China. In effect, the brick-filled building is a giant battery that stores energy with gravity instead of chemistry. China system stores 100MWh,",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 73,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "QOTD: \u201cThis national problem is being laid in the lap of New Yorkers. This is an unsustainable crisis that's been forced on New Yorkers and is going to continue to grow if there's not a real response at our border,\u201d NYC Mayor Eric Adams.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 74,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "Math problem: find the missing number. I need help because I can't really see a pattern that works for all of them here and I can't find it online either. If you want to know, the answer is in the comments, but I still don't know why it's that. [High School Math]",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 75,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "The @floteofficial Meme Of The Week goes to https://flote.app/user/InformationInc for this interesting meme. Is this a real hack? If so it's hilarious! Snickers Satisfies. To find more content like this joinflote.com and #FloteOffTwitter",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 76,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "I have an un-googleable problem with Grub. My Grub boot menu is a blank screen. User input still works. If I let the timer go out or I hit the enter key (interrupting the timer works too) it begins to boot, showing debug text on the TTY, and boots perfectly. The Grub MENU ITSELF is a black screen.",
        "body": "I have not found a combination of terms for researching this problem that doesn't show me posts about Arch/Manjaro users with blank screens \\_after booting\\_ and the like. Or nothing at all. I have an issue with the Grub Menu itself and nothing else.\n\nI have an old-ish Thinkpad with LUKS partitions (the entire /boot is plain though). I recently overhauled my LUKS decryption and am using ykfde for my yubikey, yada yada, but this issue actually began when I ran a grub-install command last month for the first time since I installed the OS in January 2022. Nothing I have done since then, for better or worse, has affected the issue.\n\nBoth themes, manjaro and starfield, are on the /boot directory and are referenced (successfully, according to verbose grub-install output and grub-mkconfig) by the grub config in /etc/default. I've tried changing the themes, the text/font, more specific and less specific arguments for grub-install (which has no errors)...\n\nI don't know what else to do! I've definitely been screwing with stuff but mainly only kernel hooks and LUKS decryption and the kernel parameters in the Grub config... stuff that comes into play \\_after\\_ the menu.\n\nTo make matters more annoying, my spouse has an HP Envy x360 with a similar Manjaro setup, and I converted her setup to decrypting with Yubikeys (ykfde), and it involved the same steps of migrating the entire /boot to the partition that used to just be /boot/efi, reinstalling grub and remaking the config after editing, etc. Her Grub Menu works perfectly.\n\nWhat is there to check? Or what other info about my system can I share to give clarity to the situation?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 77,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "Is there a way to show a custom splash screen AND disable all user input until an app opens on startup?",
        "body": "I would like to temporarily show a blank/black screen or custom splash image AND disable all user input upon login UNTIL a desired startup app becomes the active window. \n\nI have automatic login configured so that the PC auto boots straight to desktop upon power on. \n\nI also already have an autohotkey script in the startup folder which opens my desired web browser to a specific page upon login putting it into full screen and always on top. Only issue is it will take time (~30s) from the point when the user starts to have some control upon startup and when the browser finally finishes opening and becoming the active window. \n\nBasically, I want to disable as much keyboard and mouse input as possible until the browser opens. So essentially, I want to know what options I have in terms of how much keyboard and mouse I can disable and what it would take. Whatever I do, I also need the ability to make the disabling action temporary just until that browser opens - not forever. \n\nAny thoughts? Thanks in advance."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 78,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "Hello! Does anyone know how I would go about finding the startup costs of setting up a store in a different country? This is given that the company already exists and is expanding, the country is US to Switzerland.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 79,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "2 europeans (Italian/Belgian) solving a shipping problem in English, no etiquette whatsoever, probably looks funny to US people. Happened today, I'm on the right side. In this sub people often post dms where one wrong sentence is enough for no deal and blocking user. I'm very used to deals like this",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 80,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "I recently bought a cheep used moped and i had to put a new exhaust on but when I tried to put it on I found the spot to mount it had the side blown out. Finding extra parts will be extremely difficult so I was wondering if there would be an easier way to fix this problem.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 81,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "A fun maths problem for you all: a bbbaggie pumper and podcaster claims having bought 15k shares above $8 but says that now his average is $2. Using a system of two equations, can you determine how much he's lying?",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 82,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "I have been thinking about this space. Abuse whether physical or emotional is real and very serious matter. After following many of the posts here, I just wonder how many users would be posting about their experiences if they understood they could not change their partners.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 83,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "[Identify] Need help Determining if this tudor is real or not",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 84,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "[Serious] What are your strategies for determining if a news story or post is genuine and not fake news?",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 85,
      variableValues: {
        "need": "Finding users and determining if a startup problem is real",
        "title": "\ud83c\udfc8Madden 23 Startup is recruiting\ud83c\udfc8 Xbox series X/S Casual league no cheese balls! All madden 8 minute quarters Sim Discord ran Need active users and guys willing to build teams. No traits are given you will earn them shits. Rewards are given for GOTW, POTW, Streaming..Starting tonight if we can fill!",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 86,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "I\u2019m not forming habits.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 87,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "How is NNN \ud83d\udeab\ud83e\udd4a\ud83e\udd69 going for everyone? Any new habits forming? \ud83e\udde0",
        "body": "For me, my biggest habit I\u2019ve been getting back into has been working out. Been going consistently for 2 weeks now after recovering from my wisdom teeth removal. Definitely don\u2019t see myself skipping a day anytime soon, this is about discipline and showing up every day. I think my NoFap journey has definitely helped me be a lot more disciplined after having to control myself from strong urges. This is also my longest streak in a long time haha, 16 days going strong \ud83d\udcaa. I\u2019ve failed so many times over many months but I\u2019ve never given up and neither should you. My ultimate goal is to reach the ultimate 90 day benchmark but even if I am able to reach 30 days I will be so proud. \n\nMy advice is that you guys use NoFap as a tool to achieve what you want to do **right now**. Please just hop into any activity or side hustle that remotely interests you and use this new energy to form long lasting beneficial habits.\n\n\nStay strong soldiers."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 88,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Listen up, dumbass, request: When starting a new job, what are a few habits that one should prioritize forming before \u2018settling in\u2019, douche canoe.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 89,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Forming new habits takes days. Start now.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 90,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Motivation and forming new habits",
        "body": "\n1. How do you stay motivated to reach your goal? I know a lot of people weigh themselves but I don\u2019t have a scale and sometimes weighing myself makes me feel worse and unmotivated. I feel like I need an accountability partner or someone who can help me reach my goals. Do you recommend weighing yourself to track progress?\n\n2. I\u2019m having trouble building new habits because I find it SO difficult. I\u2019m stuck in my bad habits but it\u2019s all I know that makes me comfortable and starting a new habit is really difficult and scary for me.\n\n3. How do you stay patient when waiting to see results? I tend to over exercise to lose weight faster but it always backfires and I end up bingeing. How can I be more disciplined and have more self control?\n\n4. Has anyone used paid apps or online weight loss programs to lose weight?\n\n5. If anyone has a success story on how they lost weight and how long it took I would love to hear any!"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 91,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Using a new protein powder and it won't dissolve at all. It's forming small clumps throughout the whole shake and making it really hard to drink",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 92,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "i like how people assume it's me not trying hard enough and not my brain refusing to form habits",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 93,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "This is pretty insane, considering the fact that agriculture is by far the most significant form of land use (taking up 50% of the world's habitable land)",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 94,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Soo it's been about 2 months since the stripping of an insufficient vein from the groin to below my knee. Everything's been healing fine until now. A new hard \"strand\" (feeling like the vein that was there before) is forming in the exact same place!! I have a follow app soon. Any ideas??",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 95,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "weed Is not Habit Forming SURELY",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 96,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Are all save games void now? Can I revert to previous EU version and still keep eraning achivements? I had a 1675 byzantine game going, close to forming Rome, I'm still new to this game so this was kinda hard for me, don't want to do it from scratch.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 97,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "I was looking for more goals to add, because I'm trying to get better about maintaining routines and forming habits. Reading this made me lol, I think 'lay' would have been a better word choice here",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 98,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "New here, not diagnosed, is regularly forming obsessions a symptom that any of you experience?",
        "body": "I obsess about women that I come to think are perfect, and they are usually my friends, and then that ruins the friendship and I split from them abruptly.  I also obsess about making money through some startups that I could never make happen.  Just wondering if these kind of obsessions are common to BPD or if I should be researching something else."
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 99,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "They say it takes 66 days to form a new habit. Today is day 67 and I\u2019m still here! \ud83e\udd73",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 100,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "After another 10 years, I finally finished a new track - Lotus Matrix - Old Habits Die Hard",
        "body": "I'm finally back in full swing with music and after ages finished this track. Check it out and let me know what you think!"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 101,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "The struggle to not return to newbie me\u2019s habits is HARD.",
        "body": "I got inspired to build another WWII-inspired ship after a spree of building other WWII-ish ships and failing to make a modernish plane. I abhor fuel engines (I\u2019ve never gotten the hang of them) so I tend to make steam my primary power production, especially turbo-electric drive because it\u2019s so simple even though it takes unwieldy amounts of below-decks space.\n\nMy main struggle is having to justify to myself not to return to newbie-me\u2019s habit of resorting to making it all nuclear powered. Bc I use turbines I tend to use motors to drive the cool steam props, but for this size ship I need 64k power to give each of the 4 motors per prop enough power to send the ship at high speeds.\n\nThis ship is supposed to be a carrier with aircraft drones, so it definitely has the displacement and hopefully is out of harm\u2019s way to not need to constantly repair her nukes, but I calculated that if I went with the RTGs instead of the steam turbines, I could get away with powering both her props and an additional 17k energy for railguns and/or LAMS, and I\u2019d break even at around 2 hours of gameplay.\n\nAm I foolish for contemplating using RTGs again?\n\nAnd also, what are some newbie habits that you occasionally find yourself slipping into considering even though you know it\u2019s a bad idea?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 102,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Habits to start forming from Day 1 of your Software Career",
        "body": "[https://talkwithsandesh.substack.com/p/habits-to-start-forming-from-day](https://talkwithsandesh.substack.com/p/habits-to-start-forming-from-day)"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 103,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "This week's podcast episode applies to anyone doing 75 Hard, anyone who has goals, and anyone who wants to get things done in the new year. Instead of repeating old habits in 2023, lean into the systems that 75 Hard is teaching you and keep doing the small things consistently.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 104,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "If I was hypnotised to do something, say to form a new habit or whatever and was then hypnotised to forget I had been hypnotised, is there are a way to ever find out if I was hypnotised?",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 105,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Guaranteed to be habit-forming",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 106,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "How hard is it to get rid of habits and behaviours?",
        "body": "I always thought that getting rid of behaviours is an easy thing to do but the more I get older the more is realise people seem to just be \u201cpreprogrammed\u201d to do certain things.\n\nFor example, a person that frequently lies, I would think it is quite easy to \u201cjust stop\u201d but how hard is it actually? \n\nI hear marriage counsellors say don\u2019t marry a person with the hopes of changing their behaviour because it\u2019s not that simple. Is it really true that people rarely if ever manage to change out of their habits and behaviours?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 107,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "What\u2019s the ideal time for someone to track daily calories to determine maintenance before a cut ? Two weeks? A month? Keep in mind the weight going up due to forming new habits like consistent weight training , more water intake, and more carbs.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 108,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "Aeolus is my Sigilyph. He's very protective of both myself and my house and grounds (old habits die hard, I suppose). It's a good thing I live out in the mountains, or he'd probably be getting in plenty of fights.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 109,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "WHAT IS OVERTHINKING? HOW TO OVERCOME OR AVOID FORMING THE HABIT OF OVERTHINKING?",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 110,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "[Tool] Habits. Forming new, and replacing old. 4min read.",
        "body": "I'm new here. Why? Because I decided I'd like to write more this year.\n\nIn particular, I'd like to write things that stand a decent chance of helping the people who read it. I know I can't do all the stuff in that overwhelming bucket of topics justice in one go. But I can make one post, about one of the topics in that bucket! I'll figure the rest out later.\n\nI'll start with something I think has special significance today: habits.\n\nMy definition of a habit:\nA behavior done consistently, without the need for conscious effort each time. Simplification: a behavior that is \"on autopilot.\"\n\nInsights for building a new habit:\n1. Link it. Attach the behavior you want to become a habit to something else that's already a habit. Need more water? Put a glass in front of your toothbrush, that means +2 glasses/day.\n2. Dig ditches. Relying on willpower is like carrying water in buckets as a way to control where rainwater ends up. Do you want to carry water around in buckets (aka rely on memory, willpower, and motivation)? I'd rather dig ditches, and let it rain.\n3. Set up triggers. Most of us have plenty of unhelpful triggers. Maybe you pass by a coffee shop every day, triggering you to think about latte's and muffins, and leaving you with 10lbs on your hips and $300 less in your wallet. Good thing you can also set up helpful triggers, like keeping your car keys next to the blender. +1 morning smoothie!\n4. Use disruption. New beginnings and unexpected endings can shake you up. But they also shake up your etch-a-sketch. Our lives tend to fill up over time, making it seem like there isn't any free space. But when these shake-ups happen, you're getting some open space back. Use it to draw something new!\n5. Be your own architect. You have influence over a lot more than you might think. You can't control what choices a player in a casino makes, but you can design the decor, lighting, music, scents, floor layout, and even game rules. Players might think it's them against luck, but the house sets every element of the context, and therefore has all but pre-determined the outcome. Be the house.\n\nInsights for replacing a habit:\n1. Before you try to replace an undesirable habit, understand that it exists for a good reason. If you eat too many sweets, is it that you aren't eating enough food, and sweets are the easiest way to cure your hunger? Maybe eat better meals. Or are you struggling with anxiety, and sweets bring temporary relief and distraction? In that case, maybe talk to a professional and exercise more. To uncover the need being met by the current habit, you'll need to do some self reflection and be willing to be honest with yourself. It might be helpful to work with a professional if you're having a hard time getting to the bottom of it on your own.\n2. Leverage distraction. Filling your time with neutral or positive things to the point where you don't leave any opportunity for the stubborn habit, can sometimes be enough to pop you out of the rut. Once you're out, you can shift more attention towards designing your environment and becoming more mindful and intentional.\n3. Embrace peer pressure. The influence of those around you, be they close friends and family, colleagues, or social media connections, is very strong. Spending time with a friend who is a competitive runner will benefit you far more than spending time with a friend who is allergic to the gym, if your goal is to establish a habit of exercising every day. Social influence is stronger than most of us like to admit. Come to terms with it, and use it to your advantage.\n4. Be mindful. Practicing mindfulness can be a powerful tool to help you understand your habits and behaviors. It can also help you process difficult feelings and complex situations. It will help build the muscles you need to maintain emotional stability and balance, which affords you increased agency over your thoughts and behaviors. In particular, mindfulness helps you become aware of what I think of as the 3 driving forces of habit: environment, influence, and motivation.\n5. Practice being open. Trying to plan out and control everything will reduce you to nothing but anxiety, stress, frustration, and fear. It's helpful to design open space in your life, both physically and mentally, and to practice openness towards hiccups and disruptions. It's often these deviations to the plan where much of the personal growth and happiness in life comes from. We all need some degree of serendipity, so make the space for it. And when it comes, step into it with grace and curiosity.\n\nI hope you found a useful brick in that wall of words, and best of luck making 2022 a year of accomplishment and pride!"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 111,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "New to Climbing. Noticed my hands have this hard stuff forming on them. Is this aid?",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 112,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "*Frantically forms new habits*",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 113,
      variableValues: {
        "need": "Forming new habits is hard",
        "title": "I DIDN'T HEAR NO BELL!! - Here we go AGAIN! Hedgies formed a new trench at $156-$157 (which is actually an old resistance line from back in April) We bouncied hard down from this and found bouncey at $147-$148 support Trench - The Battle for the Hedgie Line of Nightmares Continues!! LFG!! \ud83d\udcaa",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 114,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "House and Senate bills aim to protect journalists' data from government surveillance",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 115,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "UK to remove Chinese-made surveillance equipment from sensitive government sites",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 116,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Senate Democrat introduces bill to protect journalists from government surveillance",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 117,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Fisa judge: Snowden's NSA disclosures triggered important spying debate; orders government to review rules on surveillance, says further declassification would protect court's integrity",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 118,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Governor Ron DeSantis Announces Legislation to Protect Floridians from a Federally Controlled Central Bank Digital Currency and Surveillance State",
        "body": "#LFG"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 119,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Anti-war Russians have used emojs as a part of a secret code to protect their communication from government surveillance.",
        "body": "Here\u2019s more (1 min read): [Anti-war Russians used emojis to evade government surveillance (WONKedition)](https://wonkedition.com/news/2022/03-14-anti-war-russians-used-emojis-to-evade-government-surveillance.html)"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 120,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Pray enlighten Me, What Mental Illness Causes Some People To Accept Disdain, Belittlement And Debasement From Treasonous Fox Hosts, Whiny Despot Child President Wannabes, and Vacuous Crazy Lawyers But Get Offended When Responsible Government Wants To Protect Their and others Dignity and rights?",
        "body": "Treasonous Fox Hosts, Whiny Despot Child President Wannabes, and Vacuous Crazy Lawyers consider Magats as idiotic braindead people who will believe anything they sell them. Magats do not benefit yet the sellers rake in millions of dollars.\n\nResponsible Democratic Government is working hard to enhance the livelihood of all Americans, including Magats, and protect the rights of all Americans, including Magats, yet they feel offended and are hostile against Democrats.\n\nCan someone please tell me what this sickness is called?"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 121,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "032423-Stephen Gardner-The united states has launched a strike attack in Syria. The French are protesting daily to wake the government up to what the people want. Polls show very few people care if Trump is arrested over weak porn star case. And Utah becomes the first state to protect teens from the",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 122,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Al Jazeera has an incendiary new documentary unmasking the terrifying reality of Israeli surveillance. Watch it at the link. The Israeli government doesn't want you to watch this. So share it with all your friends!",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 123,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "\u201cAnti-Christian Hate Crimes in Jerusalem Soaring This Year. Church sources accuse Israeli police of downplaying acts of violence towards them\u201d These supremacist radicals who want to drive out the nonJews from the holy land &amp; often protected by their government are funded by evangelical Christians",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 124,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Government urged to remove Chinese-made surveillance cameras from Dail and Seanad",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 125,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Nearly one in three Gen Zers want the government to install surveillance cameras in everyone's homes",
        "body": "Nearly one in three Gen Zers want the government to install surveillance cameras in everyone's homes\n\nPatrick Henry was 38 years old when he said, \"Give me liberty or give me death.\"\n\n\\#BigBrother  #1984  #SurveillanceState  #Communism  \n\n[https://www.americanthinker.com/blog/2023/06/nearly\\_one\\_in\\_three\\_gen\\_zers\\_want\\_the\\_government\\_to\\_install\\_surveillance\\_cameras\\_in\\_everyones\\_homes.html](https://www.americanthinker.com/blog/2023/06/nearly_one_in_three_gen_zers_want_the_government_to_install_surveillance_cameras_in_everyones_homes.html)  "
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 126,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Hey guys! I am wanting to buy a new bag after my bag from Aadi never arrived, but I\u2019m concerned about purchasing again from a seller. If I do go through a seller again, is there any way to protect myself more when making payment (rather than using PayPal f&amp;f). Appreciate your thoughts! \ud83d\ude04",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 127,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "The former NSA contractor who exposed U.S. government surveillance programs by disclosing classified material in 2013 has a new job: app developer. Edward Snowden in a video message Friday unveiled a new phone app he helped create, called Haven, that aims to protect laptops from physical tampering.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 128,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "If I block outbound internet access from my Eufy cameras, is that sufficient protection to make them safe to use them via RTSP to Synology Surveillance Station?",
        "body": "I'm not very well versed in this space, but I do have a technical background. Advice appreciated!\n\nGiven the Eufy scandal last year, I unplugged my cameras for a few months while I figured out what a more ideal home security setup might look up. At the moment, setting up LAN only cameras with Synology Surveillance Station seems like a decent compromise, though it would have been nice if there was a way to get real time motion alerts without opening myself up to privacy risks.\n\nWould blocking the Eufy camera's IP addresses from accessing the internet be sufficient to address the known privacy concerns with Eufy ([post](https://www.reddit.com/r/homeautomation/comments/11weizg/unless_you_explicitly_block_internet_access_eufy/) from 2 months ago)"
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 129,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Army Info War Division Wants Social Media Surveillance to Protect \u201cNATO Brand\u201d | An Army Cyber Command official sought military contractors that could help \u201cattack, defend, influence, and operate\u201d on global social media.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 130,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Barrasso, Lummis cosponsor legislation to protect Wyoming taxpayers from IRS surveillance",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 131,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "FedNow Enables Government Surveillance While Bitcoin Protects Privacy",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 132,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "I hired a professional to protect my home from surveillance.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 133,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Dog repellant? Does anyone have a recommendation for protection against dogs? I am a dog lover, but I want something to protect myself from the neighborhood dogs. I live in rural setting and people leave them out.",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 134,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Army Info War Division Wants Social Media Surveillance to Protect \u201cNATO Brand\u201d",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 135,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Indonesian President Jokowi wants local governments to ditch Visa, Mastercard, to protect country from possible sanctions",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 136,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "[Politics] - Senate Democrat introduces bill to protect journalists from government surveillance | The Hill",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 137,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "Oakland\u2019s Progressive Fight to Protect Residents from Government Surveillance",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 138,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "US Army Info War Division Wants Social Media Surveillance to Protect \u201cNATO Brand\u201d: An Army Cyber Command official sought military contractors that could help \u201cattack, defend, influence, and operate\u201d on global social media",
        "body": ""
      }
    },
    {
      experimentId: redditExperimentId,
      sortIndex: 139,
      variableValues: {
        "need": "Want to protect myself from government surveillance",
        "title": "What can I do to help protect myself from absorbing the negative energy of those around me",
        "body": "I just started a new job and while I absolutely love it there\u2019s a few coworkers, especially one in particular, that just exude stress. I don\u2019t blame them at all, I definitely get stressed too, but I tend to have a habit of absorbing the energy of those around me, good or bad, I\u2019m not good at brushing things off and focusing on myself. Are there any protection spells I can do? I was also considering wearing some black tourmaline around my neck when I work or even clear quartz. TIA!"
      }
    }
  ],
});