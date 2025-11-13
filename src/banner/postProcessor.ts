import { MarkdownPostProcessorContext } from 'obsidian';
import type BannersReloaded from '../main';

export const postProcessorCallback = (plugin: BannersReloaded, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
  plugin.bannerManager.processEmbed(el, ctx);
};
