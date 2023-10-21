import { AbstractInputSuggest, App, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder } from "obsidian";
import GeniusPlugin from "./main";

export interface GeniusPluginSettings {
    accessToken: string;
    template?: string;
    noteTitleTemplate: string;
    folder: string;
    clearCacheOnUnload: boolean;
    linkToNote: boolean;
}

export const DEFAULT_SETTINGS: GeniusPluginSettings = {
    accessToken: '',
    noteTitleTemplate: '{{full_title}}',
    folder: '',
    clearCacheOnUnload: true,
    linkToNote: true,
}


export class GeniusPluginSettingTab extends PluginSettingTab {
    constructor(public plugin: GeniusPlugin) {
        super(plugin.app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Access token')
            .setDesc("")
            .addText(toggle => toggle
                .setValue(this.plugin.settings.accessToken)
                .onChange(async (value) => {
                    this.plugin.settings.accessToken = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Template path')
            .setDesc("")
            .addText(toggle => {
                toggle.setValue(this.plugin.settings.template ?? '');
                new FileSuggest(this.app, toggle.inputEl, async (file) => {
                    this.plugin.settings.template = file.path;
                    await this.plugin.saveSettings();
                })
            });

        new Setting(containerEl)
            .setName('Note title template')
            .setDesc("")
            .addText(toggle => {
                toggle.setValue(this.plugin.settings.noteTitleTemplate)
                    .onChange(async (value) => {
                        this.plugin.settings.noteTitleTemplate = value;
                        await this.plugin.saveSettings();
                    })
            });

        new Setting(containerEl)
            .setName('New note folder path')
            .setDesc("leave it empty to respect app settings")
            .addText(toggle => {
                toggle
                    .setValue(this.plugin.settings.folder ?? '');
                new FolderSuggest(this.app, toggle.inputEl, async (folder) => {
                    console.log('b');
                    this.plugin.settings.folder = folder.path;
                    await this.plugin.saveSettings();
                })
            });

        new Setting(containerEl)
            .setName('Clear cache on plugin unload')
            .setDesc("")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.clearCacheOnUnload)
                .onChange(async (value) => {
                    this.plugin.settings.clearCacheOnUnload = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Link right sidebar to active note')
            .setDesc("")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.linkToNote)
                .onChange(async (value) => {
                    this.plugin.settings.linkToNote = value;
                    await this.plugin.saveSettings();
                }));

    }
}


abstract class AbstractFileSuggest<FileOrFolder extends TAbstractFile> extends AbstractInputSuggest<FileOrFolder> {
    constructor(app: App, inputEl: HTMLInputElement, private onChange: (file: FileOrFolder) => any) {
        super(app, inputEl);
    }

    renderSuggestion(file: FileOrFolder, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: FileOrFolder, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(file.path);
        this.onChange(file);
    }
}

class FileSuggest extends AbstractFileSuggest<TFile> {
    getSuggestions(qeury: string): TFile[] {
        return this.app.vault.getMarkdownFiles().filter(file => file.path.toLowerCase().includes(qeury.toLowerCase()));
    }
}

class FolderSuggest extends AbstractFileSuggest<TFolder> {
    getSuggestions(qeury: string): TFolder[] {
        return this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder && file.path.toLowerCase().includes(qeury.toLowerCase()));
    }
}