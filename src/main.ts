import { MarkdownView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, requestUrl } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import { GeniusSearchModal } from './search';
import { GeniusEvents } from './events';
import { GeniusAnnotationView, VIEW_TYPE } from './view';
import { toQueryString } from './utils';


interface GeniusPluginSettings {
	userSpecific: boolean;
}

const DEFAULT_SETTINGS: GeniusPluginSettings = {
	userSpecific: false,
}

const CLIENT_ACCESS_TOKEN = 'Xx_LtOeqSGInzY9PHikv3FAVM_McKL6nth3t2YDDTfD_fx6ILPF6bkxu0NX-o-4T';


export default class GeniusPlugin extends Plugin {
	settings: GeniusPluginSettings;
	#accessToken: string = CLIENT_ACCESS_TOKEN;
	events: GeniusEvents = new GeniusEvents();

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new GeniusPluginSettingTab(this));
		this.registerCommands();
		this.registerAuthCodeHandler();
		if (this.settings.userSpecific) {
			await this.auth();
		}
		this.registerView(
			VIEW_TYPE,
			(leaf) => new GeniusAnnotationView(leaf, this)
		);
		// this.registerEvent(
		// 	this.events.on('song-selected', (song) => {
		// 		console.log(song);
		// 	})
		// )
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', async leaf => {
				if (leaf?.view instanceof MarkdownView && leaf.view.file) {
					const dv = getAPI(this.app);
					const id = dv.page(leaf.view.file.path)?.['genius-id'];
					if (id) {
						const leaf = await this.getGeniusLeaf();
						if (leaf.view instanceof GeniusAnnotationView) {
							const res = await this.makeRequest(`/songs/${id}`);
							leaf.view.song = res.json.response.song;
						}
					}
				}
			})
		);
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


class GeniusPluginSettingTab extends PluginSettingTab {
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
	}
}
