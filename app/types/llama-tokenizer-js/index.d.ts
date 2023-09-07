declare module "llama-tokenizer-js" {
  export function encode(input: string): number[];
  export function decode(input: number[]): string;
}
