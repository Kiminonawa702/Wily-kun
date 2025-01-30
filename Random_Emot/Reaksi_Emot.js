import { jidNormalizedUser } from 'baileys';
import { sendTelegram } from '../lib/function.js';
import { emojis } from './kumpulaEmot.js';
import chalk from 'chalk'; // Tambahkan ini untuk mengimpor chalk

// Set untuk melacak story yang sudah diberi reaksi
const reactedStories = new Set();

/**
 * Memilih dua warna acak dari daftar warna yang didukung oleh chalk.
 * @param {string} text - Teks yang akan diwarnai.
 * @returns {string} - Teks yang diwarnai dengan dua warna acak.
 */
function randomColor(text) {
	const colors = [
		'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
		'gray', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
		'magentaBright', 'cyanBright', 'whiteBright'
	];
	const randomColor1 = colors[Math.floor(Math.random() * colors.length)];
	const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
	return chalk[randomColor1](chalk[randomColor2](text));
}

/**
 * Fungsi untuk mengirim reaksi emoji secara otomatis.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {import('baileys').WAMessage} m - Pesan yang diterima.
 */
export async function autoReactStatus(Wilykun, m) {
	// Daftar emoji yang akan digunakan untuk reaksi
	const emojiList = process.env.REACT_STATUS ? process.env.REACT_STATUS.split(',').map(e => e.trim()).filter(Boolean) : emojis;

	// Daftar warna yang didukung
	const colors = ['\x1b[31m', '\x1b[32m', '\x1b[33m', '\x1b[34m', '\x1b[35m', '\x1b[36m'];

	if (emojiList.length && m.key && m.key.id) {
		// Memilih emoji secara acak dari daftar
		const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
		// Memilih warna secara acak dari daftar
		const colorEmoji = colors[Math.floor(Math.random() * colors.length)];
		const colorParticipant = colors[Math.floor(Math.random() * colors.length)];
		const colorName = colors[Math.floor(Math.random() * colors.length)];
		const colorType = colors[Math.floor(Math.random() * colors.length)];

		// Cek apakah story sudah diberi reaksi
		const storyId = m.key.id;
		if (reactedStories.has(storyId)) {
			return; // Jika sudah, tidak perlu memberi reaksi lagi
		}

		await Wilykun.sendMessage(
			'status@broadcast',
			{
				react: { key: m.key, text: emoji },
			},
			{
				statusJidList: [jidNormalizedUser(Wilykun.user.id), jidNormalizedUser(m.key.participant)],
			}
		);

		// Tambahkan story ke set reactedStories
		reactedStories.add(storyId);

		const participantName = Wilykun.getName(m.key.participant);
		const messageType = m.message.imageMessage ? 'Gambar' :
							m.message.videoMessage ? 'Video' :
							m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.quotedMessage ? 'Berbagi' :
							'Teks';
		console.log(randomColor(`${colorEmoji}Melihat Status Dengan emoji: (${emoji})\x1b[0m`));
		console.log(randomColor(`${colorParticipant}Nomer: (${m.key.participant.split('@')[0]})\x1b[0m`));
		console.log(randomColor(`${colorName}Nama: (${participantName})\x1b[0m`));
		console.log(randomColor(`${colorType}Tipe: (${messageType})\x1b[0m`));
		console.log(randomColor('------------------------------------------------------------'));
	}

	// Mengirim pesan ke Telegram jika token dan ID Telegram tersedia
	if (process.env.TELEGRAM_TOKEN && process.env.ID_TELEGRAM) {
		if (m.isMedia) {
			let media = await Wilykun.downloadMediaMessage(m);
			let caption = `Dari: https://wa.me/${m.key.participant.split('@')[0]} (${Wilykun.getName(m.key.participant)})${m.body ? `\n\n${m.body}` : ''}`;
			await sendTelegram(process.env.ID_TELEGRAM, media, { type: /audio/.test(m.msg.mimetype) ? 'document' : '', caption });
		} else {
			await sendTelegram(process.env.ID_TELEGRAM, `Dari: https://wa.me/${m.key.participant.split('@')[0]} (${Wilykun.getName(m.key.participant)})\n\n${m.body}`);
		}
	}
}

/**
 * Fungsi untuk memeriksa dan memberi reaksi pada status yang belum terbaca.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 */
export async function checkUnreadStatuses(Wilykun) {
	const statuses = await Wilykun.fetchStatusUpdates();
	for (const status of statuses) {
		if (!reactedStories.has(status.key.id)) {
			await autoReactStatus(Wilykun, status);
		}
	}
}