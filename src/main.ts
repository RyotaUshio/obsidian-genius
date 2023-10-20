import { MarkdownView, Notice, Plugin, WorkspaceLeaf, requestUrl } from 'obsidian';
import { getAPI, isPluginEnabled } from 'obsidian-dataview';
import { GeniusSearchModal } from './search';
import { GeniusAnnotationView, GeniusCache, VIEW_TYPE } from './view';
import { toQueryString } from './utils';
import { GeniusPluginSettingTab, GeniusPluginSettings, DEFAULT_SETTINGS } from './settings';
import { TemplateProcessor } from './template';


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
				if (leaf?.view instanceof MarkdownView && leaf.view.file) {
					await this.loadGeniusFromPath(leaf.view.file.path);
				}
			})
		);

		this.app.workspace.onLayoutReady(() => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.file) {
				this.loadGeniusFromPath(view.file.path);
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
		})
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
		const id = this.getGeniusIdFromPath(path);
		if (id) {
			const [leaf, res] = await Promise.all([this.getGeniusLeaf(), this.makeRequest(`/songs/${id}`)]);
			if (leaf.view instanceof GeniusAnnotationView && res?.json.response.song) {
				leaf.view.song = res.json.response.song;
			}
		}
	}

	async getGeniusLeaf(): Promise<WorkspaceLeaf> {
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
			headers: { Authorization: `Bearer ${this.settings.accessToken}` }
		});
		return res;
	}
	
	notify(message: string | DocumentFragment, duration?: number) {
		new Notice(`${this.manifest.name}: ${message}`, duration);
	}
}
