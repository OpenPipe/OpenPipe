(Note: this repository practices [Readme Driven Development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html). This README documents what we **want** our UX to be, not what it is right now. We'll remove this note once the repository is ready for outside testing. Thanks for your patience! 🙏)

# 🛠 Prompt Bench 

Prompt Bench is a powerful toolset to optimize your LLM prompts. It lets you quickly generate, test and compare candidate prompts with realistic sample data.

## High-Level Features

**Configure Multiple Prompts**
Set up multiple prompt configurations and compare their output side-by-side. Each configuration can use a different model, template string, and temperature/top_p.

**Visualize Responses**
Inspect prompt completions side-by-side.

**Test Many Inputs**
Prompt Bench lets you *template* a prompt. Use the templating feature to run the prompts you're testing against many potential inputs for broader coverage of your problem space than you'd get with manual testing.

**Automatically Evaluate Prompt Quality**
1. If you're extracting structured data, Prompt Bench lets you define the expected output for each input sample and will automatically score each prompt variant for accuracy.
2. If you're generating free-form text, Prompt Bench lets you either (a) manually review outputs side-by-side to compare quality, or (b) configure a GPT-4 based evaluator to compare and score your completions automatically. 🧞‍♂️

**🪄 Auto-generate Prompts and Data**
Prompt Bench includes easy tools to generate both new prompt variants and new test inputs. It can even use the test inputs with incorrect results to guide the variant generation more intelligently!

## Supported Models
Prompt Bench currently supports GPT-3.5 and GPT-4. Wider model support is planned.

## More Features

 - [x] Fully open source
 - [x] GPT-4 and 3.5 function call support

## Future Work

 - [ ] Hosted version for easier onboarding
 - [ ] Additional model support
 - [ ] Automatic context augmentation and fine-tuning (for feature extraction and classification use-cases)

# Running Locally

We'll have a hosted version of Prompt Bench soon to make onboarding easier but for now you can run it locally.

1. Install [NodeJS 20](https://nodejs.org/en/download/current) (earlier versions will likely work but aren't tested)
2. Clone this repository: `git clone https://github.com/prompt-bench/prompt-bench`
3. Install the dependencies: `cd prompt-bench && npm install`
4. Start the app: `npm start`
5. Navigate to [http://localhost:3080](http://localhost:3080)