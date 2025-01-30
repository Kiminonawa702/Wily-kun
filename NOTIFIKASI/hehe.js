import { jidNormalizedUser } from 'baileys';
import fetch from 'node-fetch'; // Tambahkan ini untuk mengimpor node-fetch
import { getStatusViewCount } from '../lib/statusViewCounter.js'; // Tambahkan ini untuk mengimpor getStatusViewCount
import { images } from './Url_Images_Anime.js'; // Tambahkan ini untuk mengimpor URL gambar
import dotenv from 'dotenv'; // Tambahkan ini untuk mengimpor dotenv

dotenv.config(); // Load .env file

/**
 * Mengambil kata-kata bijak dari URL.
 * @returns {Promise<string[]>} - Daftar kata-kata bijak.
 */
async function getWiseWords() {
	const response = await fetch('https://raw.githubusercontent.com/fawwaz37/random/refs/heads/main/bijak.txt');
	const text = await response.text();
	return text.split('\n').map(line => line.trim()).filter(Boolean);
}

/**
 * Mengambil waktu uptime bot dalam format jam dan menit.
 * @returns {string} - Waktu uptime bot dalam format jam dan menit.
 */
function getUptimeBot() {
	const uptime = process.uptime();
	const hours = Math.floor(uptime / 3600);
	const minutes = Math.floor((uptime % 3600) / 60);
	return `${hours} jam ${minutes} menit`;
}

/**
 * Mengirim pesan saat bot terhubung.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 */
export async function sendConnectionMessage(Wilykun) {
	const randomImage = images[Math.floor(Math.random() * images.length)];
	const currentDate = new Date();
	const formattedDate = currentDate.toLocaleDateString('id-ID', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const wiseWords = await getWiseWords();
	const randomWiseWord = wiseWords[Math.floor(Math.random() * wiseWords.length)];
	const statusViewCount = getStatusViewCount();

	const features = {
		'Auto Bio Runtime': process.env.ENABLE_AUTO_BIO === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Auto Typing': process.env.ENABLE_TYPING === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Auto Recording': process.env.ENABLE_RECORDING === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Mark as Received': process.env.MARK_AS_RECEIVED === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Write Store': process.env.WRITE_STORE === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Self Mode': process.env.SELF === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌'
	};

	const activeFeatures = Object.entries(features)
		.filter(([_, status]) => status === 'Aktif ✅')
		.map(([name, status]) => `- ${name}: ${status}`)
		.join('\n');

	const inactiveFeatures = Object.entries(features)
		.filter(([_, status]) => status === 'Tidak Aktif ❌')
		.map(([name, status]) => `- ${name}: ${status}`)
		.join('\n');

	const activeFeatureCount = activeFeatures.split('\n').length;
	const inactiveFeatureCount = inactiveFeatures.split('\n').length;

	const caption = `
${Wilykun.user?.name} has Connected... 🤖
-
📅 Tanggal: ${formattedDate} 📅
-
${randomWiseWord} 💬
-
Total status dilihat: ${statusViewCount} 👀
-
Fitur Aktif (${activeFeatureCount}):
${activeFeatures}
-
Fitur Tidak Aktif (${inactiveFeatureCount}):
${inactiveFeatures}
-
Script Auto Read Story, Reaksi Emot Random, saat ini sedang dipantau oleh Owner untuk menjaga hal yang kita tidak diinginkan. 👀
`.trim();

	const message = {
		image: { url: randomImage },
		caption: caption
	};

	// Kirim pesan ke nomor WhatsApp +6282263096788
	await Wilykun.sendMessage(jidNormalizedUser('6289688206739@s.whatsapp.net'), message);
}
