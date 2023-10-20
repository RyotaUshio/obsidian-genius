import { Notice, TFile, normalizePath } from "obsidian";
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
        return data
            .replace(/\{\{ID\}\}/gi, `${song.id}`);
    }

    async createFileFromTemplate(song: Song) {
        const { app } = this.plugin;
        const template = await this.readTemplate();
        if (template === null) {
            this.plugin.notify('Template not found');
            return null;
        }

        const data = this.processTemplate(template, song);

        const sourcePath = app.workspace.getActiveFile()?.path ?? '';
        const newFileFolderPath = this.plugin.settings.folder || app.fileManager.getNewFileParent(sourcePath).path;
        // @ts-ignore
        const newFilePath = app.vault.getAvailablePath(
            normalizePath(newFileFolderPath + '/' + song.title),
            'md'
        )
        return await app.vault.create(newFilePath, data);
    }
}
