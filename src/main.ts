import { MarkdownView, Plugin, WorkspaceLeaf, requestUrl } from 'obsidian';
import { getAPI, isPluginEnabled } from 'obsidian-dataview';
import { GeniusSearchModal } from './search';
import { GeniusAnnotationView, GeniusCache, VIEW_TYPE } from './view';
import { toQueryString } from './utils';
import { GeniusPluginSettingTab, GeniusPluginSettings, DEFAULT_SETTINGS, CLIENT_ACCESS_TOKEN } from './settings';
import { TemplateProcessor } from './template';


export default class GeniusPlugin extends Plugin {
	settings: GeniusPluginSettings;
	#accessToken: string = CLIENT_ACCESS_TOKEN;
	templateProcessor: TemplateProcessor = new TemplateProcessor(this);
	cache: GeniusCache;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new GeniusPluginSettingTab(this));
		this.cache = new GeniusCache(this);
		this.addChild(this.cache);
		this.registerCommands();
		this.registerAuthCodeHandler();
		if (this.settings.userSpecific) {
			await this.auth();
		}
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

		this.addCommand({
			id: 'test',
			name: 'Test',
			callback: () => {
				this.events.trigger('song-selected', { full_title: 'test' });
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
			if (leaf.view instanceof GeniusAnnotationView) {
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

	async auth() {
		const queryParams = {
			client_id: '4PyKPrzFa92ZJmY7zf4_v61DMh_I9Xzhq22UMPbev61AHkQGNrFDltMYAa8ACf1d',
			redirect_uri: 'obsidian://genius',
			scope: 'me',
			state: (this.app as any).appId,
			response_type: 'code',
		}
		const url = 'https://api.genius.com/oauth/authorize?' + toQueryString(queryParams);
		self.open(url);
	}

	registerAuthCodeHandler() {
		this.registerObsidianProtocolHandler('genius', async (params) => {
			console.log('redirected', params);
			const queryParams = {
				code: params.code,
				client_secret: 'a_iRA7bAksoWay-xQULurkMsGmUZgloI-HDmyo9nUH5H2sG5005YQexeahqMgLjFbink2vVp8tXDsglOvYQNpA',
				grant_type: 'authorization_code',
				client_id: '4PyKPrzFa92ZJmY7zf4_v61DMh_I9Xzhq22UMPbev61AHkQGNrFDltMYAa8ACf1d',
				redirect_uri: 'obsidian://genius',
				response_type: 'code',
			};
			console.log(queryParams);
			const res = await requestUrl({
				url: 'https://api.genius.com/oauth/token',
				method: 'POST',
				body: toQueryString(queryParams)
			})
			this.#accessToken = res.json.access_token;
		})
	}

	async makeRequest(endpoint: string, params?: any) {
		endpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
		let url = `https://api.genius.com${endpoint}`;
		if (params) {
			url += '?' + toQueryString(params);
		}
		const res = await requestUrl({
			url,
			headers: { Authorization: `Bearer ${this.#accessToken}` }
		});
		return res;
	}
}
