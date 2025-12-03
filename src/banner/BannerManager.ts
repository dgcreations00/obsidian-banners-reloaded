import { App, MarkdownView, TFile, WorkspaceLeaf, Platform, MarkdownPostProcessorContext } from 'obsidian';
import { mount, unmount, SvelteComponent } from 'svelte';
import Banner from './BannerComponent.svelte';
import type { BannersReloadedSettings } from '../settings/settings';
import type { BannerStyle } from '../settings/settings';
import { t } from '../i18n';

function debounce<T extends (...args: never[]) => never>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const BANNER_APPLIED_CLASS = 'banner-plugin-applied';

export class BannerManager {
  private app: App;
  private settings: BannersReloadedSettings;
  private leafBannerMap = new Map<WorkspaceLeaf, { banner: SvelteComponent; wrapper: HTMLElement }>();
  private embeddedBannerMap = new Map<string, { banner: SvelteComponent; wrapper: HTMLElement }>();

  private scheduleLeafUpdate: (leaf: WorkspaceLeaf) => void;

  constructor(app: App, settings: BannersReloadedSettings) {
    this.app = app;
    this.settings = settings;
    this.scheduleLeafUpdate = debounce(this._updateBannerForLeafNow.bind(this), 100);
  }

  public updateBannerForLeaf(leaf: WorkspaceLeaf | null) {
    if (leaf) this.scheduleLeafUpdate(leaf);
  }

  public processEmbed(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    // @ts-expect-error: 'containerEl' is an undocumented but necessary property.
    const containerEl = ctx.containerEl;

    if (containerEl.parentElement?.querySelector(`.${BANNER_APPLIED_CLASS}`)) {
      return;
    }

    setTimeout(() => {
      const embedContext = this.getEmbedContext(el, ctx);
      if (!embedContext.isEmbed) return;

      const contextRoot = embedContext.type === 'popover' ? el.closest('.popover') : el.closest('.internal-embed');

      if (contextRoot && contextRoot.querySelector(`.${BANNER_APPLIED_CLASS}`)) {
        return;
      }

      if (
        (embedContext.type === 'embed' && !this.settings.showInEmbeds) ||
        (embedContext.type === 'popover' && !this.settings.showInPopovers)
      )
        return;

      const file = this.app.metadataCache.getFirstLinkpathDest(ctx.sourcePath, '/');
      if (!file) return;

      const docId = ctx.docId;
      if (this.embeddedBannerMap.has(docId)) {
        this.removeBannerFromEmbed(docId);
      }

      // @ts-expect-error: 'containerEl' is an undocumented but necessary property.
      this.createBanner(docId, file, ctx.containerEl, embedContext.type);
    }, 50);
  }

  public refreshAllBanners() {
    this.destroyAllBanners();
    this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
      this._updateBannerForLeafNow(leaf);
    });
    this.app.workspace.updateOptions();
  }

  public destroyAllBanners() {
    for (const leaf of this.leafBannerMap.keys()) this.removeBannerFromLeaf(leaf);
    for (const docId of this.embeddedBannerMap.keys()) this.removeBannerFromEmbed(docId);
  }

private _updateBannerForLeafNow(leaf: WorkspaceLeaf) {
    setTimeout(() => {
      if (!(leaf.view instanceof MarkdownView)) {
        document.body.classList.remove('banners-plugin-active');
        return;
      }
      
      if (this.leafBannerMap.has(leaf)) {
        this.removeBannerFromLeaf(leaf);
      }
      
      const file = leaf.view.file;
      if (!file) return;
  
      const view = leaf.view;
      let container: HTMLElement | null = null;
  
      if (view.getMode() === 'preview') {
        container = view.previewMode.containerEl.querySelector('.markdown-preview-view');
      } else {
        container = view.contentEl.querySelector<HTMLElement>('.markdown-preview-view, .cm-scroller');
      }
  
      if (!container) {
        return;
      }
  
      this.createBanner(leaf, file, container, false);
    }, 50);
  }

  private createBanner(
    key: WorkspaceLeaf | string,
    file: TFile,
    container: HTMLElement,
    embedType: 'embed' | 'popover' | false,
  ) {
    const bannerData = this.getBannerPath(file);
    if (!bannerData) return;

    const headerData = this.getHeaderData(file);
    const otherProps = this.getOtherBannerProps(file, !!embedType);
    let imageUrl: string | null;
    let errorMessage: string | undefined;

    const result = this.getImageUrl(bannerData);
    
    if (result.success) {
      imageUrl = result.url;
    } else {
      errorMessage = result.error;
    }

    const wrapper = createDiv({ cls: 'banner-wrapper' });
    wrapper.addClass(BANNER_APPLIED_CLASS);
    if (embedType === 'embed') {
      wrapper.addClass('is-real-embed');
    } else if (embedType === 'popover') {
      wrapper.addClass('is-popover-embed');
    }

    if (embedType) {
      container.parentElement?.insertBefore(wrapper, container);
    } else {
      container.prepend(wrapper);
    }

    try {
      const banner = mount(Banner, {
        target: wrapper,
        props: {
          imagePath: imageUrl,
          errorMessage: errorMessage,
          initialY: otherProps.initialY,
          height: otherProps.height,
          bannerStyle: otherProps.style,
          contentMargin: otherProps.contentMargin, 
          headerText: headerData.text,
          headerIcon: headerData.icon,
          headerHAlign: headerData.hAlign,
          headerVAlign: headerData.vAlign,
          headerDecor: headerData.decor,
          headerTitleSize: headerData.titleSize,
          headerIconSize: headerData.iconSize,
          isDraggable: !embedType,
          onLayoutChange: (event) => {
            wrapper.style.marginBottom = event.marginBottom;
          },
          onSavePosition: embedType
            ? () => {}
            : (event) => {
                void this.saveBannerPosition(file, otherProps.positionProperty, event.y);
              },
        },
      }) as SvelteComponent;

      if (key instanceof WorkspaceLeaf) {
        this.leafBannerMap.set(key, { banner, wrapper });
      } else {
        this.embeddedBannerMap.set(key, { banner, wrapper });
      }
    } catch (error) {
      console.error(t('ERROR_MOUNTING_BANNER'), error);
      wrapper.remove();
    }
  }

  private removeBannerFromLeaf(leaf: WorkspaceLeaf) {
    const entry = this.leafBannerMap.get(leaf);
    if (!entry) return;
    void unmount(entry.banner);
    entry.wrapper.remove();
    this.leafBannerMap.delete(leaf);
  }

  private removeBannerFromEmbed(docId: string) {
    const entry = this.embeddedBannerMap.get(docId);
    if (!entry) return;
    void unmount(entry.banner);
    entry.wrapper.remove();
    this.embeddedBannerMap.delete(docId);
  }

  private getBannerPath(file: TFile): { path: string; file: TFile | null } | null {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const fmProperty = this.settings.frontmatterProperty;

    if (fmProperty in frontmatter) {
      const fmValue = frontmatter[fmProperty];
      let rawPath: string | null = null;

      if (typeof fmValue === 'string') {
        const wikilinkMatch = fmValue.match(/(?:!\[\[|\[\[)(.*?)(?:\]\])/);
        if (wikilinkMatch && wikilinkMatch[1]) {
          rawPath = wikilinkMatch[1].trim();
        } else {
          rawPath = fmValue.trim();
        }
      } else if (Array.isArray(fmValue)) {
        const pathFromArray = fmValue?.[0]?.[0];
        if (typeof pathFromArray === 'string') {
          rawPath = pathFromArray.trim();
        }
      }

      if (rawPath && rawPath !== 'false' && rawPath !== 'none') {
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
          return { path: rawPath, file: null };
        }

        const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(rawPath, file.path);
        
        if (resolvedFile) {
          return { path: resolvedFile.path, file: resolvedFile };
        }
        
        return { path: rawPath, file: null };
      }
      
      if (rawPath === 'false' || rawPath === 'none') return null;
    }

    const tagsInFrontmatter = frontmatter.tags;
    const noteTags = Array.isArray(tagsInFrontmatter) ? tagsInFrontmatter : [];
    if (noteTags.length > 0) {
      for (const rule of this.settings.tagBanners) {
        if (!rule.tag) continue;
        for (const tagString of noteTags) {
          if (typeof tagString !== 'string') continue;
          const potentialMatches = [tagString, ...tagString.split('/')];
          if (potentialMatches.some((part) => part.toLowerCase() === rule.tag.toLowerCase())) {
            const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(rule.path, file.path);
            return { path: rule.path, file: resolvedFile };
          }
        }
      }
    }

    if (this.settings.enableBanners && this.settings.defaultBannerPath) {
       const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(this.settings.defaultBannerPath, file.path);
       return { path: this.settings.defaultBannerPath, file: resolvedFile };
    }

    return null;
  }

private getHeaderData(file: TFile): { 
    text?: string; 
    icon?: string;
    hAlign: 'left' | 'center' | 'right';
    vAlign: 'top' | 'center' | 'bottom' | 'edge';
    decor: 'none' | 'shadow' | 'border';
    titleSize: string;
    iconSize: string;
  } {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const fmProperty = this.settings.frontmatterProperty;
    
    const textProperty = `${fmProperty}_header`;
    const iconProperty = `${fmProperty}_icon`;

    let textTemplate: string | undefined;
    let icon: string | undefined;

    if (textProperty in frontmatter) {
      const fmValue = frontmatter[textProperty];
      if (fmValue && fmValue !== 'false' && fmValue !== 'none') {
        textTemplate = fmValue as string;
      }
    } else if (this.settings.showDefaultHeaderText) {
      textTemplate = this.settings.defaultHeaderText;
    }

    if (iconProperty in frontmatter) {
      const fmValue = frontmatter[iconProperty];
      if (fmValue && fmValue !== 'false' && fmValue !== 'none') icon = fmValue as string;
    } else if (this.settings.showDefaultHeaderIcon) {
      icon = this.settings.defaultHeaderIcon;
    }

    const text = this.processHeaderTemplate(textTemplate, frontmatter, file);
    
    const hAlignProperty = `${fmProperty}_header_h_align`;
    const vAlignProperty = `${fmProperty}_header_v_align`;
    const decorProperty = `${fmProperty}_header_decor`;
    const titleSizeProperty = `${fmProperty}_header_title_size`;
    const iconSizeProperty = `${fmProperty}_header_icon_size`;

    const hAlign = frontmatter[hAlignProperty] || this.settings.headerHorizontalAlign;
    const vAlign = frontmatter[vAlignProperty] || this.settings.headerVerticalAlign;
    const decor = frontmatter[decorProperty] || this.settings.headerDecor;
    const titleSize = (frontmatter[titleSizeProperty] as string) || this.settings.headerTitleSize;
    const iconSize = (frontmatter[iconSizeProperty] as string) || this.settings.headerIconSize;

    return { text, icon, hAlign, vAlign, decor, titleSize, iconSize };
  }

  private processHeaderTemplate(
    template: string | undefined, 
    frontmatter: Record<string, unknown>,
    file: TFile
  ): string | undefined {
    if (!template) return undefined;

    let processedTemplate = template;
    const regex = /\{\{(.*?)\}\}/g;

    const maxIterations = 10;
    let currentIteration = 0;

    while (processedTemplate.match(regex) && currentIteration < maxIterations) {
      processedTemplate = processedTemplate.replace(regex, (match, propertyName: string) => {
        const prop = propertyName.trim();

        if (prop === 'filename') {
          return file.basename;
        }

        if (prop in frontmatter) {
          const value = frontmatter[prop];

          if (typeof value === 'string') {
            return value;
          }
          if (typeof value === 'number') {
            return value.toString();
          }
          if (typeof value === 'boolean') {
            return value.toString();
          }
        }
        
        return match;
      });
      currentIteration++;
    }

    if (currentIteration === maxIterations) {
      console.warn(
        `[Banners Reloaded] Template processing reached the iteration limit...`
      );
    }

    return processedTemplate;
  }

  private getOtherBannerProps(file: TFile, isEmbed: boolean) {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const fmProperty = this.settings.frontmatterProperty;
    let height: string;

    if (isEmbed) {
      const heightProperty = `${fmProperty}_height`;
      height = frontmatter?.[heightProperty] || this.settings.embedBannerHeight;
    } else if (Platform.isMobile) {
      const mobileHeightProperty = `${fmProperty}_mobile_height`;
      height = frontmatter?.[mobileHeightProperty] || this.settings.defaultBannerMobileHeight;
    } else {
      const heightProperty = `${fmProperty}_height`;
      height = frontmatter?.[heightProperty] || this.settings.defaultBannerHeight;
    }

    const positionProperty = `${fmProperty}_y`;
    const initialY = frontmatter?.[positionProperty] ?? '50%';
    const styleProperty = `${fmProperty}_style`;
    const style: BannerStyle = frontmatter?.[styleProperty] || this.settings.bannerStyle || 'solid';
    const marginProperty = `${fmProperty}_content_margin`;
    const contentMargin = frontmatter?.[marginProperty] ?? this.settings.contentMargin ?? 0;
    return { height, initialY, positionProperty, style, contentMargin };
  }

  private getEmbedContext(
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): { isEmbed: boolean; type?: 'embed' | 'popover' } {
    if (el.closest('.popover')) return { isEmbed: true, type: 'popover' };
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView && activeView.file && activeView.file.path !== ctx.sourcePath)
      return { isEmbed: true, type: 'embed' };
    return { isEmbed: false };
  }

private getImageUrl(
    bannerData: { path: string; file: TFile | null },
  ): { success: true; url: string; error: null } | { success: false; error: string } {
    const { path, file } = bannerData;

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return { success: true, url: path, error: null };
    }

    if (file instanceof TFile) {
      const url = this.app.vault.adapter.getResourcePath(file.path);
      return { success: true, url: url, error: null };
    }

    const fallbackFile = this.app.vault.getAbstractFileByPath(path);
    if (fallbackFile instanceof TFile) {
      const url = this.app.vault.adapter.getResourcePath(fallbackFile.path);
      return { success: true, url: url, error: null };
    }

    return { success: false, error: t('ERROR_INVALID_LOCAL_IMAGE').replace('{0}', path) };
  }

  private async saveBannerPosition(file: TFile, property: string, value: string) {
    try {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        fm[property] = value;
      });
    } catch (error) {
      console.error(t('ERROR_SAVING_POSITION').replace('{0}', file.path), error);
    }
  }
}
