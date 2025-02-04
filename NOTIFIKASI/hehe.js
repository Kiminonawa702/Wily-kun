import { jidNormalizedUser } from 'baileys';
import fetch from 'node-fetch'; // Tambahkan ini untuk mengimpor node-fetch
import { getStatusViewCount } from '../lib/statusViewCounter.js'; // Tambahkan ini untuk mengimpor getStatusViewCount
import { images } from './Url_Images_Anime.js'; // Tambahkan ini untuk mengimpor URL gambar
import dotenv from 'dotenv'; // Tambahkan ini untuk mengimpor dotenv

dotenv.config(); // Load .env file

const WISE_WORDS_URL = 'https://raw.githubusercontent.com/fawwaz37/random/refs/heads/main/bijak.txt'; // Tambahkan URL di sini

/**
 * Mengambil kata-kata bijak dari URL.
 * @returns {Promise<string[]>} - Daftar kata-kata bijak.
 */
async function getWiseWords() {
	const response = await fetch(WISE_WORDS_URL);
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
		'Auto Bio': process.env.ENABLE_AUTO_BIO === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Auto Rekam': process.env.ENABLE_RECORDING === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Auto Restart': process.env.AUTO_RESTART === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Auto Ketik': process.env.ENABLE_TYPING === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Tandai Diterima': process.env.MARK_AS_RECEIVED === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Mode Pribadi': process.env.SELF === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Simpan Data': process.env.WRITE_STORE === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Reaksi Emoji': process.env.ENABLE_EMOJI_REACTION === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Pesan Selamat Datang': process.env.ENABLE_WELCOME === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Pesan Perpisahan': process.env.ENABLE_GOODBYE === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Notifikasi Nama Group': process.env.ENABLE_NAME_CHANGE_NOTIFICATION === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Notifikasi Deskripsi Group': process.env.ENABLE_DESCRIPTION_CHANGE_NOTIFICATION === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Notifikasi Izin Group': process.env.ENABLE_PERMISSION_CHANGE_NOTIFICATION === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Promosi/Demosi Admin': process.env.ENABLE_PROMOTION_DEMOTION === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌',
		'Antitoxic': process.env.ENABLE_ANTITOXIC === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌', // Tambahkan fitur Antitoxic
		'Auto Clear Session': process.env.ENABLE_AUTO_CLEAR_SESSION === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌', // Tambahkan fitur Auto Clear Session
	};

	const activeFeatures = Object.entries(features)
		.filter(([_, status]) => status === 'Aktif ✅')
		.map(([name, status]) => `- ${name}: ${status}`)
		.sort()
		.join('\n');

	const inactiveFeatures = Object.entries(features)
		.filter(([_, status]) => status === 'Tidak Aktif ❌')
		.map(([name, status]) => `- ${name}: ${status}`)
		.sort()
		.join('\n');

	const activeFeatureCount = activeFeatures.split('\n').length;
	const inactiveFeatureCount = inactiveFeatures.split('\n').length;
	const totalFeatures = activeFeatureCount + inactiveFeatureCount;

	const caption = `
${Wilykun.user?.name} has Connected... 🤖
-
Tanggal: ${formattedDate} 📅
-
${randomWiseWord} 💬
-
Total status dilihat: ${statusViewCount} 👀
-
Total fitur saat ini: ${totalFeatures} 😎
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
		caption: caption,
		contextInfo: {
			mentionedJid: [Wilykun.user.id],
			forwardingScore: 100,
			isForwarded: true,
			forwardedMessage: true,
			forwardedNewsletterMessageInfo: {
				newsletterJid: '120363312297133690@newsletter',
				newsletterName: 'Info Seputar Anime Dll 👤',
				serverMessageId: '143'
			}
		}
	};

	// Kirim pesan ke nomor WhatsApp +6282263096788
	await Wilykun.sendMessage(jidNormalizedUser('6282263096788@s.whatsapp.net'), message);
}
