declare module "!!raw-loader!*" {
  const content: string;
  export default content;
}

interface WebpackRequireContext {
  keys(): string[];
  <T = unknown>(id: string): T;
}

declare namespace NodeJS {
  interface Require {
    context(
      directory: string,
      useSubdirectories?: boolean,
      regExp?: RegExp,
    ): WebpackRequireContext;
  }
}
