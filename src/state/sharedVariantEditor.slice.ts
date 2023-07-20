import { type RouterOutputs } from "~/utils/api";
import { type SliceCreator } from "./store";
import loader from "@monaco-editor/loader";
import formatPromptConstructor from "~/utils/formatPromptConstructor";

export const editorBackground = "#fafafa";

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
    // We only want to run this client-side
    if (typeof window === "undefined") return;

    const [monaco, promptTypes] = await Promise.all([
      loader.init(),
      get().api?.client.experiments.promptTypes.query(),
    ]);

    monaco.editor.defineTheme("customTheme", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": editorBackground,
      },
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      strictNullChecks: true,
      lib: ["esnext"],
    });

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      promptTypes ?? "",
      "file:///PromptTypes.d.ts",
    );

    monaco.languages.registerDocumentFormattingEditProvider("typescript", {
      provideDocumentFormattingEdits: async (model) => {
        return [
          {
            range: model.getFullModelRange(),
            text: await formatPromptConstructor(model.getValue()),
          },
        ];
      },
    });

    set((state) => {
      state.sharedVariantEditor.monaco = monaco;
    });
    get().sharedVariantEditor.updateScenariosModel();
  },
  scenarios: [],
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
    declare var scenario: Scenario | { [key: string]: string };
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
