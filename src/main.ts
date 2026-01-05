import './styles.css';
import { MarkdownView, Plugin, requireApiVersion } from 'obsidian';
import { BannerManager } from './banner/BannerManager';
import { BannerSettingTab, DEFAULT_SETTINGS, type BannersReloadedSettings } from './settings/settings';
import { postProcessorCallback } from './banner/postProcessor';
import { loadLanguage, t } from './i18n';

export default class BannersReloaded extends Plugin {
  settings: BannersReloadedSettings;
  public bannerManager: BannerManager;

  private _handleThemeChange() {
    const theme = this.app.vault.getConfig('cssTheme');
    if (theme && theme.toLowerCase() === 'minimal') {
      document.body.classList.add('banners-reloaded-minimal-fix');
    } else {
      document.body.classList.remove('banners-reloaded-minimal-fix');
    }
  }

  private _handleVersionStyling() {
    if (requireApiVersion("1.11.0")) {
      document.body.classList.add('banners-reloaded');
      document.body.classList.remove('banners-reloaded-legacy');
    } else {
      document.body.classList.add('banners-reloaded-legacy');
      document.body.classList.remove('banners-reloaded');
    }
  }
  
  async onload() {
    loadLanguage();

    const startTime = performance.now();
    console.debug(t('PLUGIN_LOAD_START').replace('{0}', this.manifest.version));

    await this.loadSettings();
    this.bannerManager = new BannerManager(this.app, this.settings);
    this.addSettingTab(new BannerSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => this.bannerManager.refreshAllBanners());

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        this.bannerManager.updateBannerForLeaf(leaf);
      }),
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        for (const leaf of leaves) {
          if (leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path) {
            this.bannerManager.updateBannerForLeaf(leaf);
          }
        }
      }),
    );

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
          if (leaf.view instanceof MarkdownView) {
            this.bannerManager.updateBannerForLeaf(leaf);
          }
        });
      }),
    );
    
    this.registerMarkdownPostProcessor((el, ctx) => {
      postProcessorCallback(this, el, ctx);
    });

    const endTime = performance.now();
    const durationInSeconds = (endTime - startTime) / 1000;
    console.debug(
      t('PLUGIN_LOAD_SUCCESS').replace('{0}', this.manifest.version).replace('{1}', durationInSeconds.toFixed(3)),
    );
    
    this._handleThemeChange();
    this._handleVersionStyling();

    this.registerEvent(this.app.workspace.on('css-change', () => this._handleThemeChange()));
    this.registerEvent(this.app.workspace.on('css-change', () => this._handleVersionStyling()));
  }

  onunload() {
    this.bannerManager?.destroyAllBanners();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.bannerManager.refreshAllBanners();
  }
}
