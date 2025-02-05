import { retry } from './utils/retry.js'; // Import the retry function

export const handleAntiWaMe = async (Wilykun, message) => {
	const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
	const waMeRegex = /https:\/\/wa\.me\/|wa\.me/gi;

	if (waMeRegex.test(text) && !message.key.fromMe) {
		try {
			await retry(() => Wilykun.sendMessage(message.key.remoteJid, { text: 'Link wa.me detected and will be deleted.' }));
			await retry(() => Wilykun.sendMessage(message.key.remoteJid, { delete: message.key }, { quoted: message }));
		} catch (error) {
			console.error('Failed to delete wa.me link message:', error);
		}
	}
};
