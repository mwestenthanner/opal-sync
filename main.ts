import { DEFAULT_SETTINGS, OpalSyncSettings, OpalSyncSettingsTab } from 'src/settings';
import { Plugin, Vault } from 'obsidian';
import { fetchNotes, uploadNotes } from 'src/sync';

export default class OpalSync extends Plugin {
	settings: OpalSyncSettings;
	vault: Vault;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'write-to-obsidian-command',
			name: 'Fetch notes',
			callback: async () => {
				await fetchNotes()
			}
		});

		this.addCommand({
			id: 'sync-to-opal-command',
			name: 'Upload notes',
			callback: async () => {
				await uploadNotes();		
			}
		});

		this.addSettingTab(new OpalSyncSettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

