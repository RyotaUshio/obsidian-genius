import { ItemView, WorkspaceLeaf, requestUrl, request, Component } from "obsidian";
import { Song } from "./types";
import GeniusPlugin from "./main";
import { renderDOM } from "./utils";

export const VIEW_TYPE = "genius-annotation";

export class GeniusAnnotationView extends ItemView {
    _song: Song | null = null;

    constructor(leaf: WorkspaceLeaf, public plugin: GeniusPlugin) {
        super(leaf);
        this.icon = 'headphones';
    }

    get song() {
        return this._song;
    }

    set song(songSimplified: Song | null) {
        this._song = songSimplified;
        if (songSimplified) {
            (async () => {
                const res = await this.plugin.makeRequest(songSimplified.api_path);
                if (res?.json.response.song) {
                    this._song = res.json.response.song;
                    this.onOpen();
                }
            })();
        }
    }

    getDisplayText() {
        return this.song?.full_title ?? 'No song selected';
    }
    getViewType() {
        return VIEW_TYPE;
    }

    async onOpen() {
        const { containerEl, contentEl } = this;
        containerEl.addClass('genius-annotation-view');
        contentEl.empty();
        const iconContainer = contentEl.createDiv({ cls: 'genius-icon-container' });
        const el = contentEl.createDiv();
        this.renderDescription(el);

        iconContainer.appendChild(
            this.addAction('book', 'Show Description', () => {
                this.renderDescription(el);
            })
        );
        iconContainer.appendChild(
            this.addAction('pencil', 'Show Annotations', () => {
                this.renderAnnotations(el);
            })
        );
        iconContainer.appendChild(
            this.addAction('external-link', 'View on genius.com', () => {
                if (!this.song) {
                    this.plugin.notify('No song selected');
                    return;
                }
                self.open(this.song.url, '_blank');
            })
        );
        iconContainer.appendChild(
            this.addAction('youtube', 'Listen in YouTube', () => {
                if (!this.song) {
                    this.plugin.notify('No song selected');
                    return;
                }
                const url = this.song.media.find((item: any) => item.provider == 'youtube')?.url
                if (url) {
                    self.open(url, '_blank');
                } else {
                    this.plugin.notify('No YouTube link found');
                }
            })
        );

    }

    async renderDescription(el: HTMLElement) {
        el.empty();

        if (this.song) {
            let url = this.plugin.cache.get(this.song)?.imageUrl;
            if (!url) {
                const res = await requestUrl(this.song.song_art_image_url)
                if (res.headers['content-type'].startsWith('image')) {
                    const blob = new Blob([res.arrayBuffer], { type: res.headers['content-type'] });
                    url = URL.createObjectURL(blob);
                    this.plugin.cache.set(this.song, { imageUrl: url });
                }
            }
            if (url) {
                el.createEl('img', { attr: { src: url } });
            }
            el.appendChild(renderDOM(this.song.description.dom))
        } else {
            this.plugin.notify('No song selected');
        }
    }

    async renderAnnotations(el: HTMLElement) {
        el.empty();
        if (this.song) {
            let referents = this.plugin.cache.get(this.song)?.referents;
            if (!referents) {
                el.createDiv({ text: 'Loading annotations...' });
                const res = await request(this.song.url);
                const pattern = /"referents\\"\:\[(\d+(,\d+)*)\]/
                const referentIds = res.match(pattern)?.[1]?.split(',');
                referents = await Promise.all(referentIds?.map(async id => {
                    const res = await this.plugin.makeRequest('/referents/' + id);
                    const referent = res!.json.response.referent;
                    return referent;
                }) ?? []);
                this.plugin.cache.set(this.song, { referents });
            }

            el.empty();

            for (const referent of referents) {
                const annotation = referent.annotations[0];
                const itemEl = el.createDiv({ cls: 'genius-annotation-item' });
                const fragmentEl = createDiv({
                    text: referent.fragment,
                    cls: ['genius-annotation-fragment']
                })
                if (annotation?.verified) {
                    fragmentEl.addClass('genius-verified')
                }
                itemEl.appendChild(fragmentEl);
                const annotationEl = renderDOM(annotation?.body.dom);
                itemEl.appendChild(annotationEl);
            }
        } else {
            this.plugin.notify('No song selected');
        }
    }
}


export type GeniusCacheItem = { imageUrl?: string, description: any, referents: any[] };

export class GeniusCache extends Component {
    constructor(public plugin: GeniusPlugin) {
        super();
    }

    read(): Record<string, GeniusCacheItem> {
        return this.plugin.app.loadLocalStorage('genius-cache') ?? {};
    }

    write(cache: Record<string, GeniusCacheItem>) {
        this.plugin.app.saveLocalStorage('genius-cache', cache);
    }

    delete(): void {
        this.plugin.app.saveLocalStorage('genius-cache', null);
    }

    get(song: Song): GeniusCacheItem | null {
        const cache = this.read();
        return cache[song.id] ?? null;
    }

    set(song: Song, data: Partial<GeniusCacheItem>): void {
        const cache = this.read();
        cache[song.id] = Object.assign({}, cache[song.id], data);
        this.write(cache);
    }

    onunload(): void {
        const cache = this.read();
        Object.values(cache).forEach(({ imageUrl }) => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        });
        if (this.plugin.settings.clearCacheOnUnload) {
            this.delete();
            return;
        }
        for (const id in cache) {
            delete cache[id].imageUrl;
        }
        this.write(cache);
    }
}