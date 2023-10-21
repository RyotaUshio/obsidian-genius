import { SuggestModal } from "obsidian";
import GeniusPlugin from "./main";
import { GeniusAnnotationView } from "./view";
import { GeniusSearchResultItem, SongSimplified } from "./types";

/**
 * Search all songs hosted on Genius.
 */
export class GeniusSearchModal extends SuggestModal<SongSimplified> {
    constructor(public plugin: GeniusPlugin) {
        super(plugin.app);
        this.setInstructions([
            { command: '↑↓', purpose: 'to navigate' },
            { command: '↵', purpose: 'to open in sidebar' },
            { command: 'cmd+↵', purpose: 'to open in genius.com' },
            { command: 'shift+↵', purpose: 'to create note' }
        ])
        this.setPlaceholder('Search genius.com...');
    }

    async getSuggestions(query: string) {
        const res = await this.plugin.makeRequest('/search', { q: query });
        let songs = (res?.json.response.hits as GeniusSearchResultItem[]).map(item => item.result);
        return songs;
    }

    renderSuggestion(song: SongSimplified, el: HTMLElement) {
        el.createDiv({ text: song.title_with_featured });
        el.createEl('small', { text: song.primary_artist.name });
    }

    async onChooseSuggestion(song: SongSimplified, ev: MouseEvent | KeyboardEvent) {
        const shouldOpenView = !ev.metaKey;
        if (song && shouldOpenView) {
            const leaf = await this.plugin.getGeniusLeaf();
            if (leaf.view instanceof GeniusAnnotationView) {
                leaf.view.song = song;
            }
            if (ev.shiftKey) {
                const file = await this.plugin.templateProcessor.createFileFromTemplate(song);
                if (file) {
                    await this.plugin.app.workspace.getLeaf().openFile(file);
                }
            }
        } else {
            self.open(song.url);
            return;
        }
    }
}
