import loader, { type Monaco } from "@monaco-editor/loader";

import { type RouterOutputs } from "~/utils/api";
import { type SliceCreator } from "./store";
import formatPromptConstructor from "~/promptConstructor/format";

export const editorBackground = "#fafafa";

export type CreatedEditor = ReturnType<Monaco["editor"]["create"]>;

type EditorOptions = {
  getContent: () => string;
  setContent: (content: string) => void;
};

export type SharedVariantEditorSlice = {
  monaco: null | Monaco;
  loadMonaco: () => Promise<void>;
  scenarioVars: RouterOutputs["scenarioVars"]["list"];
  updateScenariosModel: () => void;
  setScenarioVars: (scenarioVars: RouterOutputs["scenarioVars"]["list"]) => void;
  editorOptionsMap: Record<string, EditorOptions>;
  updateOptionsForEditor: (uiId: string, { getContent, setContent }: EditorOptions) => void;
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
  scenarioVars: [],
  setScenarioVars: (scenarios) => {
    set((state) => {
      state.sharedVariantEditor.scenarioVars = scenarios;
    });

    get().sharedVariantEditor.updateScenariosModel();
  },

  updateScenariosModel: () => {
    const monaco = get().sharedVariantEditor.monaco;
    if (!monaco) return;

    const modelContents = `    
    declare var scenario: {
      ${get()
        .sharedVariantEditor.scenarioVars.map((s) => `${s.label}: string;`)
        .join("\n")}
    };
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
  editorOptionsMap: {},
  updateOptionsForEditor: (uiId, options) => {
    set((state) => {
      state.sharedVariantEditor.editorOptionsMap[uiId] = options;
    });
  },
});
