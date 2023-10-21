import { ItemView, WorkspaceLeaf, requestUrl, Component, setIcon } from "obsidian";
import { Song } from "./types";
import GeniusPlugin from "./main";

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
        if (JSON.stringify(songSimplified) == JSON.stringify(this._song)) return;
        this._song = songSimplified;
        if (songSimplified) {
            (async () => {
                const song = await this.plugin.getSong(songSimplified.id);
                if (song) {
                    this._song = song;
                    this.onOpen();
                    await this.plugin.getAllReferents(song);
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
        el.addClasses(['markdown-rendered', 'markdown-preview-view'])
        this.renderDescription(el);

        iconContainer.appendChild(
            this.addAction('book', 'Show Description', () => {
                if (this.song) {
                    this.renderDescription(el);
                } else {
                    this.plugin.notify('No song selected');
                }
            })
        );
        iconContainer.appendChild(
            this.addAction('pencil', 'Show Annotations', () => {
                if (this.song) {
                    this.renderAnnotations(el);
                } else {
                    this.plugin.notify('No song selected');
                }
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
            let url = this.plugin.cache.get(this.song.id)?.imageUrl;
            if (!url) {
                const res = await requestUrl(this.song.song_art_image_url)
                if (res.headers['content-type'].startsWith('image')) {
                    const blob = new Blob([res.arrayBuffer], { type: res.headers['content-type'] });
                    url = URL.createObjectURL(blob);
                    this.plugin.cache.set(this.song.id, { imageUrl: url });
                }
            }
            if (url) {
                el.createEl('img', {
                    attr: { src: url },
                    cls: 'genius-song-art-image'
                });
            }
            el.createDiv().innerHTML = this.song.description.html;
        }
    }

    async renderAnnotations(el: HTMLElement) {
        el.empty();
        if (this.song) {
            el.createDiv({ text: 'Loading annotations...' });
            const { referents, referentOrder } = await this.plugin.getAllReferents(this.song);

            el.empty();

            for (const referentId of referentOrder) {
                const referent = referents[referentId];
                if (!referent) {
                    console.log(referentId);
                    continue;
                }
                const annotation = referent.annotations[0];
                const itemEl = el.createDiv({ cls: 'genius-annotation-item' });
                const fragmentContainer = itemEl.createDiv({
                    cls: 'genius-annotation-fragment-container'
                })
                const fragmentInner = fragmentContainer.createDiv({
                    text: referent.fragment,
                    cls: 'genius-annotation-fragment-inner'
                });
                if (annotation?.verified) {
                    fragmentContainer.addClass('genius-annotation-verifed');
                    const verifiedIcon = fragmentContainer.createDiv({
                        cls: 'genius-annotation-verified-icon',
                    })
                    setIcon(verifiedIcon, 'checkmark');
                    fragmentContainer.insertBefore(verifiedIcon, fragmentInner);
                }

                itemEl.createDiv().innerHTML = annotation?.body.html;
            }
        }
    }
}


export type GeniusCacheItem = { imageUrl?: string, song: Song, referents: Record<number, any>, referentOrder: number[] };

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

    get(id: number): GeniusCacheItem | null {
        const cache = this.read();
        return cache[id] ?? null;
    }

    set(id: number, data: Partial<GeniusCacheItem>): void {
        const cache = this.read();
        cache[id] = Object.assign({}, cache[id], data);
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
            delete cache[id]["imageUrl"];
        }
        this.write(cache);
    }
}