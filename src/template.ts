import { TFile, normalizePath } from "obsidian";
import GeniusPlugin from "./main";
import { Song } from "./types";

export class TemplateProcessor {
    constructor(public plugin: GeniusPlugin) {
    }

    async readTemplate(): Promise<string | null> {
        const { vault } = this.plugin.app;

        if (this.plugin.settings.template) {
            const file = vault.getAbstractFileByPath(this.plugin.settings.template);
            if (file instanceof TFile) {
                return await this.plugin.app.vault.read(file);
            }
        }

        return null;
    }

    processTemplate(data: string, song: Song): string {
        return data.replace(/\{\{(.*?)\}\}/gi, (match, attr) => {
            return eval(`(song) => String(song.${attr})`)(song);
        });
    }

    async createFileFromTemplate(song: Song) {
        const { app } = this.plugin;
        const template = await this.readTemplate();
        if (template === null) {
            this.plugin.notify('Template not found');
            return null;
        }

        const content = this.processTemplate(template, song);

        let title = this.processTemplate(this.plugin.settings.noteTitleTemplate, song);
        title = title.endsWith('.md') ? title : title + '.md';

        const sourcePath = app.workspace.getActiveFile()?.path ?? '';
        const newFileFolderPath = this.plugin.settings.folder || app.fileManager.getNewFileParent(sourcePath).path;
        const newFilePath = normalizePath(newFileFolderPath + '/' + title);
        const existingFile = app.vault.getAbstractFileByPath(newFilePath);
        console.log(existingFile);
        return existingFile instanceof TFile ? existingFile : await app.vault.create(newFilePath, content);
    }
}
