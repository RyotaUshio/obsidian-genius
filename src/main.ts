import { MarkdownView, Notice, Plugin, WorkspaceLeaf, addIcon, request, requestUrl } from 'obsidian';
import { getAPI, isPluginEnabled } from 'obsidian-dataview';
import { GeniusSearchModal } from './search';
import { GeniusAnnotationView, GeniusCache, VIEW_TYPE } from './view';
import { toQueryString } from './utils';
import { GeniusPluginSettingTab, GeniusPluginSettings, DEFAULT_SETTINGS } from './settings';
import { TemplateProcessor } from './template';
import { GeniusPluginError, Song } from './types';


export default class GeniusPlugin extends Plugin {
	settings: GeniusPluginSettings;
	templateProcessor: TemplateProcessor = new TemplateProcessor(this);
	cache: GeniusCache;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new GeniusPluginSettingTab(this));
		this.cache = new GeniusCache(this);
		this.addChild(this.cache);
		this.registerCommands();
		this.registerView(
			VIEW_TYPE,
			(leaf) => new GeniusAnnotationView(leaf, this)
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', async leaf => {
				if (this.settings.linkToNote && leaf?.view instanceof MarkdownView && leaf.view.file) {
					await this.loadGeniusFromPath(leaf.view.file.path);
				}
			})
		);

		this.app.workspace.onLayoutReady(async () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (this.settings.linkToNote && view?.file) {
				await this.loadGeniusFromPath(view.file.path);
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	registerCommands() {
		this.addCommand({
			id: 'search',
			name: 'Search',
			callback: () => {
				const modal = new GeniusSearchModal(this);
				modal.open();
			}
		});
	}

	getGeniusIdFromPath(path: string) {
		if (isPluginEnabled(this.app)) {
			const dv = getAPI(this.app);
			const id = dv.page(path)?.['genius-id'];
			return id;
		}
		const id = this.app.metadataCache.getCache(path)?.frontmatter?.['genius-id'];
		return id;
	}

	async loadGeniusFromPath(path: string) {
		if (this.settings.template == path) {
			return;
		}
		const id = this.getGeniusIdFromPath(path);
		if (id) {
			const [leaf, song] = await Promise.all([
				this.getGeniusLeaf(),
				this.getSong(id),
			]);
			if (leaf.view instanceof GeniusAnnotationView && song) {
				leaf.view.song = song;
			}
		}
	}

	async getSong(id: number) {
		let song = this.cache.get(id)?.song;
		if (!song) {
			const res = await this.makeRequest(`/songs/${id}`, { text_format: 'dom,html' });
			song = res?.json.response.song;
			this.cache.set(id, { song });
		}
		return song ?? null;
	}

	async getReferents(id: number): Promise<Record<number, any>> {
		let referents = this.cache.get(id)?.referents;
		if (!referents) {
			referents = {};
			let page = 1;
			while (true) {
				const res = await this.makeRequest('/referents', {
					song_id: id,
					text_format: 'dom,html',
					per_page: 50,
					page: page++,
				});
				const newReferents = res?.json.response.referents ?? [];
				newReferents.forEach((referent: any) => {
					referents![referent.id] = referent;
				})
				if (newReferents.length < 50) {
					break;
				}
			}
			if (Object.keys(referents).length) {
				this.cache.set(id, { referents });
			}
		}
		return referents;
	}

	async getReferentOrder(song: Song): Promise<number[]> {
		let referentOrder = this.cache.get(song.id)?.referentOrder;
		if (!referentOrder) {
			referentOrder = [];
			const res = await request(song.url);
			const regex = /<a href="\/(\d+)\//g;
			let result;
			while ((result = regex.exec(res)) !== null) {
				referentOrder.push(+result[1]);
			}
			this.cache.set(song.id, { referentOrder });
		}
		return referentOrder;
	}

	async getAllReferents(song: Song): Promise<{ referents: Record<number, any>, referentOrder: number[] }> {
		const [referents, referentOrder] = await Promise.all([
			this.getReferents(song.id),
			this.getReferentOrder(song),
		]);
		await Promise.all(
			(referentOrder
				.filter(id => !(id in referents)) ?? [])
				.map(async id => {
					const res = await this.makeRequest(`/referents/${id}`, {
						text_format: 'dom,html'
					})
					if (res?.json.response.referent) {
						referents[id] = res.json.response.referent;
					}
				})
		);
		return { referents, referentOrder };
	}

	async getGeniusLeaf(reveal: boolean = true): Promise<WorkspaceLeaf> {
		let { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		let leaves = workspace.getLeavesOfType(VIEW_TYPE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}

		if (reveal) {
			workspace.revealLeaf(leaf);
		}

		return leaf;
	}

	async makeRequest(endpoint: string, params?: any) {
		if (!this.settings.accessToken) {
			this.notify('Access token not set');
			return;
		}

		endpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
		let url = `https://api.genius.com${endpoint}`;
		if (params) {
			url += '?' + toQueryString(params);
		}
		const res = await requestUrl({
			url,
			headers: { 
				Accept: 'application/json',
				Authorization: `Bearer ${this.settings.accessToken}`,
			}
		});
		return res;
	}

	notify(message: string | DocumentFragment, duration?: number) {
		new Notice(`${this.manifest.name}: ${message}`, duration);
	}
}
