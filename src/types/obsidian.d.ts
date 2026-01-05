import 'obsidian';

declare module 'obsidian' {
  function requireApiVersion(version: string): boolean;
  interface Vault {
    getConfig(key: 'cssTheme'): string | undefined;
  }
}