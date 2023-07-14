import { type RouterOutputs } from "~/utils/api";
import { type SliceCreator } from "./store";
import loader from "@monaco-editor/loader";
import openAITypes from "~/codegen/openai.types.ts.txt";

export type SharedVariantEditorSlice = {
  monaco: null | ReturnType<typeof loader.__getMonacoInstance>;
  loadMonaco: () => Promise<void>;
  scenarios: RouterOutputs["scenarios"]["list"];
  updateScenariosModel: () => void;
  setScenarios: (scenarios: RouterOutputs["scenarios"]["list"]) => void;
};

export const createVariantEditorSlice: SliceCreator<SharedVariantEditorSlice> = (set, get) => ({
  monaco: loader.__getMonacoInstance(),
  loadMonaco: async () => {
    const monaco = await loader.init();

    monaco.editor.defineTheme("customTheme", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#fafafa",
      },
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      lib: ["esnext"],
    });

    monaco.editor.createModel(
      `
      ${openAITypes}

      declare var prompt: components["schemas"]["CreateChatCompletionRequest"];
      `,
      "typescript",
      monaco.Uri.parse("file:///openai.types.ts"),
    );

    set((state) => {
      state.sharedVariantEditor.monaco = monaco;
    });
    get().sharedVariantEditor.updateScenariosModel();
  },
  scenarios: [],
  // scenariosModel: null,
  setScenarios: (scenarios) => {
    set((state) => {
      state.sharedVariantEditor.scenarios = scenarios;
    });

    get().sharedVariantEditor.updateScenariosModel();
  },

  updateScenariosModel: () => {
    const monaco = get().sharedVariantEditor.monaco;
    if (!monaco) return;

    const modelContents = `
    const scenarios = ${JSON.stringify(
      get().sharedVariantEditor.scenarios.map((s) => s.variableValues),
      null,
      2,
    )} as const;
    
    type Scenario = typeof scenarios[number];
    declare var scenario: Scenario | null;
    `;

    const scenariosModel = monaco.editor.getModel(monaco.Uri.parse("file:///scenarios.ts"));

    if (scenariosModel) {
      scenariosModel.setValue(modelContents);
    } else {
      monaco.editor.createModel(
        modelContents,
        "typescript",
        monaco.Uri.parse("file:///scenarios.ts"),
      );
    }
  },
});
