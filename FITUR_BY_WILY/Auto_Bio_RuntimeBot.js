import baileys, { jidNormalizedUser } from 'baileys';
const { WASocket } = baileys;
import { retryWithDelay } from '../utils/retry.js'; // Pastikan path ini benar

/**
 * Memperbarui bio WhatsApp dengan waktu uptime bot.
 * @param {WASocket} Wilykun - Instance WASocket.
 */
export const updateAutoBio = async (Wilykun) => {
	const uptime = process.uptime();
	const uptimeString = new Date(uptime * 1000).toISOString().substr(11, 8); // Format HH:MM:SS
	const status = `Bot aktif selama ${uptimeString}`;

	await retryWithDelay(async () => {
		await Wilykun.updateProfileStatus(status);
	}, 3, 1000); // Coba ulangi hingga 3 kali dengan jeda 1 detik
};

// Fungsi untuk memperbarui bio dengan throttle
export const throttledUpdateAutoBio = throttle(updateAutoBio, 60000); // Batasi pembaruan setiap 60 detik

// Fungsi throttle untuk membatasi frekuensi permintaan
function throttle(func, limit) {
	let inThrottle;
	return function (...args) {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}
