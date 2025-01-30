import os from 'os';

/**
 * Mengupdate bio bot dengan informasi runtime.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 */
export function updateBio(Wilykun) {
	setInterval(() => {
		const uptime = process.uptime();
		const hours = Math.floor(uptime / 3600);
		const minutes = Math.floor((uptime % 3600) / 60);
		const bio = `🟢 Online selama ${hours} jam ⏰ ${minutes} menit ⏳`;

		Wilykun.updateProfileStatus(bio).catch(console.error);
	}, 60 * 1000); // Update setiap 1 menit
}
