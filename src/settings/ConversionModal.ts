import { Modal, Notice, Setting } from 'obsidian';
import type BannersReloaded from '../main';
import { t } from '../i18n';

export class ConversionModal extends Modal {
  plugin: BannersReloaded;
  private progressBar: HTMLDivElement;
  private progressText: HTMLSpanElement;
  private logContainer: HTMLDivElement;
  private startButton: HTMLButtonElement;
  private closeButton: HTMLButtonElement;

  constructor(plugin: BannersReloaded) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('banner-conversion-modal');

    contentEl.createEl('h2', { text: t('MODAL_CONVERSION_HEADING') });
    contentEl.createEl('p', { text: t('MODAL_CONVERSION_DESC') });

    contentEl.createEl('h3', { text: t('MODAL_CONVERSION_LOG_HEADING') });
    this.logContainer = contentEl.createDiv({ cls: 'conversion-log' });

    const progressContainer = contentEl.createDiv({ cls: 'progress-bar-container' });
    this.progressBar = progressContainer.createDiv({ cls: 'progress-bar' });
    this.progressText = contentEl.createEl('span', { cls: 'progress-text' });

    this.progressText.setText(t('MODAL_CONVERSION_READY'));
    this.progressBar.setText('0%');

    new Setting(contentEl)
      .addButton((button) => {
        this.closeButton = button
          .setButtonText(t('MODAL_CONVERSION_CLOSE_BUTTON'))
          .onClick(() => this.close()).buttonEl;
      })
      .addButton((button) => {
        this.startButton = button
          .setButtonText(t('MODAL_CONVERSION_START_BUTTON'))
          .setCta()
          .onClick(() => this.runConversion()).buttonEl;
      });
  }

  async runConversion() {
    this.startButton.disabled = true;
    this.closeButton.disabled = true;
    this.startButton.setText(t('MODAL_CONVERSION_IN_PROGRESS_BUTTON'));
    this.logContainer.empty();
    
    new Notice(t('MODAL_CONVERSION_IN_PROGRESS_NOTICE'));
    const wikilinkRegex = /(?:!\[\[|\[\[)(.*?)(?:\]\])/;
    const fmProperty = this.plugin.settings.frontmatterProperty;
    let updatedFiles = 0;
    
    const files = this.app.vault.getMarkdownFiles();
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      let fileModified = false;
      
      try {
        await this.app.fileManager.processFrontMatter(file, (fm) => {
          if (fmProperty in fm) {
            const fmValue = fm[fmProperty];
            let cleanPath: string | null = null;

            if (typeof fmValue === 'string') {
              const match = fmValue.match(wikilinkRegex);
              if (match && match[1]) {
                cleanPath = match[1].trim();
              } else {
                cleanPath = fmValue.trim();
              }
            } else if (Array.isArray(fmValue)) {
              const pathFromArray = fmValue?.[0]?.[0];
              if (typeof pathFromArray === 'string') {
                cleanPath = pathFromArray.trim();
              }
            }

            if (cleanPath) {
              if (cleanPath === 'false' || cleanPath === 'none' || cleanPath.startsWith('http')) {
                  return; 
              }

              const newValue = `[[${cleanPath}]]`;

              if (fmValue !== newValue) {
                fm[fmProperty] = newValue;
                fileModified = true;
              }
            }
          }
        });

        if (fileModified) {
          updatedFiles++;
          this.logContainer.createEl('div', { text: `${t('MODAL_CONVERSION_LOG_SUCCESS')}${file.path}` });
          this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
      } catch (error) {
        console.error(`Error procesando el archivo ${file.path}:`, error);
        this.logContainer.createEl('div', { text: `${t('MODAL_CONVERSION_LOG_ERROR')}${file.path}` });
      }

      const progressPercent = ((i + 1) / totalFiles) * 100;
      const roundedPercent = Math.round(progressPercent);

      this.progressBar.style.width = `${progressPercent}%`;
      this.progressBar.setText(`${roundedPercent}%`);
      this.progressText.setText(
        t('MODAL_CONVERSION_PROGRESS')
          .replace('{0}', String(i + 1))
          .replace('{1}', String(totalFiles)),
      );

      if (i % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.progressBar.setText(t('MODAL_CONVERSION_DONE_BAR'));
    this.progressText.setText(
      t('MODAL_CONVERSION_SUCCESS').replace('{0}', String(updatedFiles)).replace('{1}', String(totalFiles)),
    );
    new Notice(t('MODAL_CONVERSION_SUCCESS_NOTICE').replace('{0}', String(updatedFiles)));
    this.startButton.setText(t('MODAL_CONVERSION_DONE_BUTTON'));
    this.closeButton.disabled = false;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
