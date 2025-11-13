import { MarkdownPostProcessorContext } from 'obsidian';
import type MyPlugin from '../main';

export const postProcessorCallback = (plugin: MyPlugin, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
  plugin.bannerManager.processEmbed(el, ctx);
};
