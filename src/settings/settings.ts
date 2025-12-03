import {
  App,
  PluginSettingTab,
  Setting,
  FuzzySuggestModal,
  TFile,
  FuzzyMatch,
  AbstractInputSuggest,
  TFolder,
} from 'obsidian';
import type BannersReloaded from '../main';
import { ConversionModal } from './ConversionModal';
import { t } from '../i18n';

interface TagBannerRule {
  tag: string;
  path: string;
}
export type BannerStyle = 'solid' | 'gradient' | 'blur' | 'swoosh' | 'swoosh-inverted';


export interface BannersReloadedSettings {
  enableBanners: boolean;
  defaultBannerPath: string;
  frontmatterProperty: string;
  defaultBannerHeight: string;
  defaultBannerMobileHeight: string;
  embedBannerHeight: string;
  bannerStyle: BannerStyle;
  contentMargin: number;
  showDefaultHeaderText: boolean;
  showDefaultHeaderIcon: boolean;
  defaultHeaderIcon: string;
  defaultHeaderText: string;
  headerHorizontalAlign: 'left' | 'center' | 'right';
  headerVerticalAlign: 'top' | 'center' | 'bottom' | 'edge';
  headerDecor: 'none' | 'shadow' | 'border';
  headerTitleSize: string;
  headerIconSize: string;
  showInEmbeds: boolean;
  showInPopovers: boolean;
  tagBanners: TagBannerRule[];
  bannerFolder: string;
  headerTitleFallback: string;
}

export const DEFAULT_SETTINGS: BannersReloadedSettings = {
  enableBanners: true,
  defaultBannerPath: '',
  frontmatterProperty: 'banner',
  defaultBannerHeight: '200px',
  defaultBannerMobileHeight: '150px',
  embedBannerHeight: '120px',
  bannerStyle: 'solid',
  contentMargin: 0,
  showDefaultHeaderText: true,
  showDefaultHeaderIcon: true,
  defaultHeaderIcon: '',
  defaultHeaderText: '{{title}}',
  headerHorizontalAlign: 'left',
  headerVerticalAlign: 'bottom',
  headerTitleSize: '1.2em',
  headerIconSize: '1.5em',
  headerDecor: 'shadow',
  showInEmbeds: true,
  showInPopovers: true,
  tagBanners: [],
  bannerFolder: '',
  headerTitleFallback: 'title',
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'];
class BannerSuggestModal extends FuzzySuggestModal<TFile> {
  private plugin: BannersReloaded;
  onChoose: (result: string) => void;

  constructor(plugin: BannersReloaded, onChoose: (result: string) => void) {
    super(plugin.app);
    this.plugin = plugin;
    this.onChoose = onChoose;
  }

  getItems(): TFile[] {
    const allFiles = this.app.vault.getFiles();
    const imageFiles = allFiles.filter((file) => IMAGE_EXTENSIONS.includes(file.extension.toLowerCase()));
    const bannerFolder = this.plugin.settings.bannerFolder.trim();

    if (bannerFolder) {
      return imageFiles.filter((file) => file.path.startsWith(bannerFolder + '/'));
    }

    return imageFiles;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
    const file = match.item;

    el.empty();
    const container = el.createDiv({ cls: 'banner-suggestion-container' });

    const previewWrapper = container.createDiv({ cls: 'banner-suggestion-preview' });
    previewWrapper.style.height = this.plugin.settings.defaultBannerHeight;

    const img = previewWrapper.createEl('img');
    const imageUrl = this.app.vault.adapter.getResourcePath(file.path);
    img.src = imageUrl;

    container.createDiv({ cls: 'banner-suggestion-text', text: file.path });
  }

  onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent) {
    this.onChoose(file.path);
  }
}

class FolderSuggest extends AbstractInputSuggest<TFolder> {
  private inputEl: HTMLInputElement;

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.inputEl = inputEl;
  }

  getSuggestions(query: string): TFolder[] {
    const lowerCaseQuery = query.toLowerCase();
    const allFolders = this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder);
    return allFolders.filter((folder) => folder.path.toLowerCase().includes(lowerCaseQuery));
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder): void {
    this.inputEl.value = folder.path;
    this.inputEl.trigger('input');
    this.close();
  }
}
export class BannerSettingTab extends PluginSettingTab {
  plugin: BannersReloaded;

  constructor(app: App, plugin: BannersReloaded) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t('SETTINGS_FOLDER_NAME'))
      .setDesc(t('SETTINGS_FOLDER_DESC'))
      .addText((text) => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder(t('SETTINGS_FOLDER_PLACEHOLDER'))
          .setValue(this.plugin.settings.bannerFolder)
          .onChange(async (value) => {
            this.plugin.settings.bannerFolder = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('SETTINGS_ENABLE_DEFAULT_NAME'))
      .setDesc(t('SETTINGS_ENABLE_DEFAULT_DESC'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableBanners).onChange(async (value) => {
          this.plugin.settings.enableBanners = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_DEFAULT_BANNER_IMAGE_NAME'))
      .setDesc(t('SETTINGS_DEFAULT_BANNER_IMAGE_DESC'))
      .addButton((button) => {
        button.setButtonText(t('SETTINGS_SELECT_IMAGE_BUTTON')).onClick(() => {
          new BannerSuggestModal(this.plugin, (result) => {
            void (async () => {
              this.plugin.settings.defaultBannerPath = result;
              await this.plugin.saveSettings();
              this.display();
            })();
          }).open();
        });
      });

    if (this.plugin.settings.defaultBannerPath) {
      containerEl
        .createEl('p', { text: t('SETTINGS_CURRENT_DEFAULT_FILE') })
        .createEl('strong', { text: this.plugin.settings.defaultBannerPath });
    }

    new Setting(containerEl)
      .setName(t('SETTINGS_FM_PROPERTY_NAME'))
      .setDesc(t('SETTINGS_FM_PROPERTY_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_FM_PROPERTY_PLACEHOLDER'))
          .setValue(this.plugin.settings.frontmatterProperty)
          .onChange(async (value) => {
            this.plugin.settings.frontmatterProperty = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_DEFAULT_HEIGHT_NAME'))
      .setDesc(t('SETTINGS_DEFAULT_HEIGHT_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_DEFAULT_HEIGHT_PLACEHOLDER'))
          .setValue(this.plugin.settings.defaultBannerHeight)
          .onChange(async (value) => {
            this.plugin.settings.defaultBannerHeight = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_DEFAULT_MOBILE_HEIGHT_NAME'))
      .setDesc(t('SETTINGS_DEFAULT_MOBILE_HEIGHT_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_DEFAULT_MOBILE_HEIGHT_PLACEHOLDER'))
          .setValue(this.plugin.settings.defaultBannerMobileHeight)
          .onChange(async (value) => {
            this.plugin.settings.defaultBannerMobileHeight = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_STYLE_NAME'))
      .setDesc(t('SETTINGS_STYLE_DESC'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('solid', t('SETTINGS_STYLE_SOLID'))
          .addOption('gradient', t('SETTINGS_STYLE_GRADIENT'))
          .addOption('blur', t('SETTINGS_STYLE_BLUR'))
          .addOption('swoosh', t('SETTINGS_STYLE_SWOOSH'))
          .addOption('swoosh-inverted', t('SETTINGS_STYLE_SWOOSH_INVERTED'))
          .setValue(this.plugin.settings.bannerStyle)
          .onChange(async (value) => {
            this.plugin.settings.bannerStyle = value as BannerStyle;
            await this.plugin.saveSettings();
            this.plugin.bannerManager.refreshAllBanners();
          }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_CONTENT_MARGIN_NAME'))
      .setDesc(t('SETTINGS_CONTENT_MARGIN_DESC'))
      .addText((text) => {
        text.inputEl.type = 'number';
        
        text
          .setPlaceholder('0')
          .setValue(String(this.plugin.settings.contentMargin))
          .onChange(async (value) => {
            if (value === '') {
              this.plugin.settings.contentMargin = 0;
            } else {
              const num = parseInt(value);
              if (!isNaN(num)) {
                this.plugin.settings.contentMargin = num;
              }
            }
            await this.plugin.saveSettings();
            this.plugin.bannerManager.refreshAllBanners();
          });
      });
      
    new Setting(containerEl).setName(t('SETTINGS_HEADER_HEADING')).setHeading();

    new Setting(containerEl)
      .setName(t('SETTINGS_ENABLE_DEFAULT_HEADER_TEXT_NAME'))
      .setDesc(t('SETTINGS_ENABLE_DEFAULT_HEADER_TEXT_DESC'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showDefaultHeaderText).onChange(async (value) => {
          this.plugin.settings.showDefaultHeaderText = value;
          await this.plugin.saveSettings();
        }),
      );
        
    new Setting(containerEl)
      .setName(t('SETTINGS_ENABLE_DEFAULT_HEADER_ICON_NAME'))
      .setDesc(t('SETTINGS_ENABLE_DEFAULT_HEADER_ICON_DESC'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showDefaultHeaderIcon).onChange(async (value) => {
          this.plugin.settings.showDefaultHeaderIcon = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_DEFAULT_HEADER_TEXT_NAME'))
      .setDesc(t('SETTINGS_DEFAULT_HEADER_TEXT_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_DEFAULT_HEADER_TEXT_PLACEHOLDER'))
          .setValue(this.plugin.settings.defaultHeaderText)
          .onChange(async (value) => {
            this.plugin.settings.defaultHeaderText = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_DEFAULT_HEADER_ICON_NAME'))
      .setDesc(t('SETTINGS_DEFAULT_HEADER_ICON_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_DEFAULT_HEADER_ICON_PLACEHOLDER'))
          .setValue(this.plugin.settings.defaultHeaderIcon)
          .onChange(async (value) => {
            this.plugin.settings.defaultHeaderIcon = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_HEADER_TITLE_SIZE_NAME'))
      .setDesc(t('SETTINGS_HEADER_TITLE_SIZE_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_HEADER_TITLE_SIZE_PLACEHOLDER'))
          .setValue(this.plugin.settings.headerTitleSize)
          .onChange(async (value) => {
            this.plugin.settings.headerTitleSize = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_HEADER_ICON_SIZE_NAME'))
      .setDesc(t('SETTINGS_HEADER_ICON_SIZE_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_HEADER_ICON_SIZE_PLACEHOLDER'))
          .setValue(this.plugin.settings.headerIconSize)
          .onChange(async (value) => {
            this.plugin.settings.headerIconSize = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl).setName(t('SETTINGS_HEADER_HALIGN_NAME')).addDropdown((dropdown) =>
      dropdown
        .addOption('left', t('SETTINGS_HEADER_HALIGN_LEFT'))
        .addOption('center', t('SETTINGS_HEADER_HALIGN_CENTER'))
        .addOption('right', t('SETTINGS_HEADER_HALIGN_RIGHT'))
        .setValue(this.plugin.settings.headerHorizontalAlign)
        .onChange(async (value: 'left' | 'center' | 'right') => {
          this.plugin.settings.headerHorizontalAlign = value;
          await this.plugin.saveSettings();
        }),
    );

    new Setting(containerEl).setName(t('SETTINGS_HEADER_VALIGN_NAME')).addDropdown((dropdown) =>
      dropdown
        .addOption('top', t('SETTINGS_HEADER_VALIGN_TOP'))
        .addOption('center', t('SETTINGS_HEADER_VALIGN_CENTER'))
        .addOption('bottom', t('SETTINGS_HEADER_VALIGN_BOTTOM'))
        .addOption('edge', t('SETTINGS_HEADER_VALIGN_EDGE'))
        .setValue(this.plugin.settings.headerVerticalAlign)
        .onChange(async (value: 'top' | 'center' | 'bottom' | 'edge') => {
          this.plugin.settings.headerVerticalAlign = value;
          await this.plugin.saveSettings();
        }),
    );

    new Setting(containerEl)
      .setName(t('SETTINGS_HEADER_DECOR_NAME'))
      .setDesc(t('SETTINGS_HEADER_DECOR_DESC'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('none', t('SETTINGS_HEADER_DECOR_NONE'))
          .addOption('border', t('SETTINGS_HEADER_DECOR_BORDER'))
          .addOption('shadow', t('SETTINGS_HEADER_DECOR_SHADOW'))
          .setValue(this.plugin.settings.headerDecor)
          .onChange(async (value: 'none' | 'border' | 'shadow') => {
            this.plugin.settings.headerDecor = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl).setName(t('SETTINGS_CONTEXTS_HEADING')).setHeading();

    new Setting(containerEl)
      .setName(t('SETTINGS_SHOW_IN_EMBEDS_NAME'))
      .setDesc(t('SETTINGS_SHOW_IN_EMBEDS_DESC'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showInEmbeds).onChange(async (value) => {
          this.plugin.settings.showInEmbeds = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_SHOW_IN_POPOVERS_NAME'))
      .setDesc(t('SETTINGS_SHOW_IN_POPOVERS_DESC'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showInPopovers).onChange(async (value) => {
          this.plugin.settings.showInPopovers = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('SETTINGS_EMBED_HEIGHT_NAME'))
      .setDesc(t('SETTINGS_EMBED_HEIGHT_DESC'))
      .addText((text) =>
        text
          .setPlaceholder(t('SETTINGS_EMBED_HEIGHT_PLACEHOLDER'))
          .setValue(this.plugin.settings.embedBannerHeight)
          .onChange(async (value) => {
            this.plugin.settings.embedBannerHeight = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl).setName(t('SETTINGS_TAG_BANNERS_HEADING')).setHeading();
    const description = document.createDocumentFragment();
    description.append(t('SETTINGS_TAG_BANNERS_DESC'));
    containerEl.append(description);

    new Setting(containerEl).addButton((button) => {
      button
        .setButtonText(t('SETTINGS_ADD_TAG_RULE_BUTTON'))
        .setCta()
        .onClick(async () => {
          this.plugin.settings.tagBanners.push({ tag: '', path: '' });
          await this.plugin.saveSettings();
          this.display();
        });
    });

    const rulesContainer = containerEl.createDiv();

    let dragOverElement: HTMLElement | null = null;

    this.plugin.settings.tagBanners.forEach((rule, index) => {
      const setting = new Setting(rulesContainer);
      const settingEl = setting.settingEl;
      settingEl.draggable = true;
      settingEl.addClass('is-draggable');

      settingEl.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', index.toString());
        settingEl.addClass('is-dragging');
      });

      settingEl.addEventListener('dragend', () => {
        settingEl.removeClass('is-dragging');
        dragOverElement?.removeClass('drag-over');
        dragOverElement = null;
      });

      settingEl.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (settingEl === dragOverElement) return;
        dragOverElement?.removeClass('drag-over');
        settingEl.addClass('drag-over');
        dragOverElement = settingEl;
      });

      settingEl.addEventListener('drop', (event) => {
        void (async () => {
          event.preventDefault();
          const fromIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
          const toIndex = index;

          if (fromIndex !== toIndex) {
            const [movedRule] = this.plugin.settings.tagBanners.splice(fromIndex, 1);
            this.plugin.settings.tagBanners.splice(toIndex, 0, movedRule);
            await this.plugin.saveSettings();
            this.display();
          }
        })();
      });

      setting.setDesc(rule.path || t('SETTINGS_NO_BANNER_SELECTED'));
      setting.addText((text) => {
        text
          .setPlaceholder(t('SETTINGS_TAG_PLACEHOLDER'))
          .setValue(rule.tag)
          .onChange(async (value) => {
            rule.tag = value.trim();
            await this.plugin.saveSettings();
          });
      });

      setting.addButton(button => {
        button
          .setButtonText(t('SETTINGS_SELECT_IMAGE_BUTTON'))
          .onClick(() => {
            new BannerSuggestModal(this.plugin, (result) => {
              void (async () => {
                rule.path = result;
                await this.plugin.saveSettings();
                this.display();
              })();
            }).open();
          });
      });

      setting.addExtraButton((button) => {
        button
          .setIcon('trash')
          .setTooltip('Eliminar regla')
          .onClick(async () => {
            this.plugin.settings.tagBanners.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          });
      });
    });
    rulesContainer.addEventListener('dragleave', (event) => {
      if (event.target === rulesContainer) {
        dragOverElement?.removeClass('drag-over');
        dragOverElement = null;
      }
    });

    new Setting(containerEl).setName(t('SETTINGS_MAINTENANCE_HEADING')).setHeading();

    new Setting(containerEl)
      .setName(t('SETTINGS_CONVERSION_TOOL_NAME'))
      .setDesc(t('SETTINGS_CONVERSION_TOOL_DESC'))
      .addButton((button) => {
        button.setButtonText(t('SETTINGS_OPEN_TOOL_BUTTON')).onClick(() => {
          new ConversionModal(this.plugin).open();
        });
      });
  }
}
