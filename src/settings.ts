import { PluginSettingTab, Setting } from "obsidian";
import GeniusPlugin from "./main";

export interface GeniusPluginSettings {
    userSpecific: boolean;
    accessToken: string;
    template?: string;
    folder: string;
    clearCacheOnUnload: boolean;
}

export const CLIENT_ACCESS_TOKEN = 'Xx_LtOeqSGInzY9PHikv3FAVM_McKL6nth3t2YDDTfD_fx6ILPF6bkxu0NX-o-4T';

export const DEFAULT_SETTINGS: GeniusPluginSettings = {
    userSpecific: false,
    accessToken: CLIENT_ACCESS_TOKEN,
    folder: '',
    clearCacheOnUnload: true,
}


export class GeniusPluginSettingTab extends PluginSettingTab {
    constructor(public plugin: GeniusPlugin) {
        super(plugin.app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('User specific access')
            .setDesc("Need user-specific behaviors?")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.userSpecific)
                .onChange(async (value) => {
                    this.plugin.settings.userSpecific = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        await this.plugin.auth();
                    }
                }));

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
