// Any import that ends in .txt should be treated as a string

declare module "*.txt" {
  const content: string;
  export default content;
}
