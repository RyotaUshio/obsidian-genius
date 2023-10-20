import { Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';


interface GeniusPluginSettings {
	userSpecific: boolean;
}

const DEFAULT_SETTINGS: GeniusPluginSettings = {
	userSpecific: false,
}

const CLIENT_ACCESS_TOKEN = 'Xx_LtOeqSGInzY9PHikv3FAVM_McKL6nth3t2YDDTfD_fx6ILPF6bkxu0NX-o-4T';


export default class GeniusPlugin extends Plugin {
	settings: GeniusPluginSettings;
	accessToken: string = CLIENT_ACCESS_TOKEN;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new GeniusPluginSettingTab(this));
		this.registerAuthCodeHandler();
		if (this.settings.userSpecific) {
			await this.auth();
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
			this.accessToken = res.json.access_token;
		})
	}

	async makeRequest(endpoint: string) {
		await requestUrl({
			url: `https://api.genius.com/${endpoint}`,
			headers: { Authorization: `Bearer ${this.accessToken}` }
		});
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

function toQueryString(obj: any) {
	return Object.entries(obj).map(([key, val]) => `${key}=${val}`).join('&');
}