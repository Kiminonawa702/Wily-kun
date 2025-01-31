import baileys from 'baileys';
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
	return `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`;
}

/**
 * Memperbarui bio WhatsApp dengan waktu uptime bot.
 * @param {WASocket} Wilykun - Instance WASocket.
 */
export async function updateAutoBio(Wilykun) {
	if (process.env.ENABLE_AUTO_BIO === 'true') {
		const uptime = getUptimeBot();
		await Wilykun.updateProfileStatus(`Bot berjalan selama: ${uptime}`);
	}
}
