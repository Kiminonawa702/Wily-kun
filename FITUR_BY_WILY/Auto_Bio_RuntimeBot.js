import baileys, { jidNormalizedUser } from 'baileys';
const { WASocket } = baileys;

/**
 * Mengambil waktu uptime bot dalam format hari, jam, menit, dan detik.
 * @returns {string} - Waktu uptime bot dalam format hari, jam, menit, dan detik.
 */
function getUptimeBot() {
	const uptime = process.uptime();
	const days = Math.floor(uptime / (3600 * 24));
	const hours = Math.floor((uptime % (3600 * 24)) / 3600);
	const minutes = Math.floor((uptime % 3600) / 60);
	const seconds = Math.floor(uptime % 60);
	return `${days} hari 🗓️ ${hours} jam ⏰ ${minutes} menit ⏳ ${seconds} detik ⏱️`;
}

/**
 * Memperbarui bio WhatsApp dengan waktu uptime bot.
 * @param {WASocket} Wilykun - Instance WASocket.
 */
export const updateAutoBio = async (Wilykun) => {
	try {
		if (Wilykun.ws.readyState !== Wilykun.ws.OPEN) {
			console.error('Connection is not open. Skipping bio update.');
			return;
		}

		const uptime = getUptimeBot();
		await Wilykun.updateProfileStatus(`🤖 Bot berjalan selama: ${uptime} `);
	} catch (error) {
		console.error('Failed to update profile status:', error);
	}
};
