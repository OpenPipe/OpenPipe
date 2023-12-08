import loader, { type Monaco } from "@monaco-editor/loader";

import { type SliceCreator } from "./store";

export const editorBackground = "#fafafa";

export type SharedArgumentsEditorSlice = {
  monaco: null | Monaco;
  loadMonaco: () => Promise<void>;
};

export type CreatedEditor = ReturnType<Monaco["editor"]["create"]>;

export const createArgumentsEditorSlice: SliceCreator<SharedArgumentsEditorSlice> = (set, get) => ({
  monaco: loader.__getMonacoInstance(),
  loadMonaco: async () => {
    // We only want to run this client-side
    if (typeof window === "undefined") return;

    const monaco = await loader.init();

    monaco.editor.defineTheme("customTheme", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
      },
    });

    set((state) => {
      state.sharedArgumentsEditor.monaco = monaco;
    });
  },
});
