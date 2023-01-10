import OpalSync from 'main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export interface OpalSyncSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: OpalSyncSettings = {
	mySetting: 'default'
}

export class OpalSyncSettingsTab extends PluginSettingTab {
	plugin: OpalSync;

	constructor(app: App, plugin: OpalSync) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Opal Sync Settings'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
