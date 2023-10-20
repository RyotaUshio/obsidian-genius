import { PluginSettingTab, Setting } from "obsidian";
import GeniusPlugin from "./main";

export interface GeniusPluginSettings {
    accessToken: string;
    template?: string;
    folder: string;
    clearCacheOnUnload: boolean;
    linkToNote: boolean;
}

export const DEFAULT_SETTINGS: GeniusPluginSettings = {
    accessToken: '',
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
            .addText(toggle => toggle
                .setValue(this.plugin.settings.template ?? '')
                .onChange(async (value) => {
                    this.plugin.settings.template = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('New note path')
            .setDesc("leave it empty to respect app settings")
            .addText(toggle => toggle
                .setValue(this.plugin.settings.folder ?? '')
                .onChange(async (value) => {
                    this.plugin.settings.folder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Delete cache on plugin unload')
            .setDesc("")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.clearCacheOnUnload)
                .onChange(async (value) => {
                    this.plugin.settings.clearCacheOnUnload = value;
                    await this.plugin.saveSettings();
                }));

    }
}
