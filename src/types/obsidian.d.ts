import 'obsidian';

declare module 'obsidian' {
  interface Vault {
    getConfig(key: 'cssTheme'): string | undefined;
  }
}