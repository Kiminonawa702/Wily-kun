import { jidNormalizedUser } from 'baileys';
import { retryWithDelay } from '../utils/retry.js'; // Pastikan path ini benar
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Tambahkan ini untuk mengimpor dotenv

dotenv.config(); // Load .env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const txtToxicPath = path.join(__dirname, '../../DATA/txt_toxic.json');
let offensiveWords = [];

try {
	const data = fs.readFileSync(txtToxicPath, 'utf-8');
	offensiveWords = JSON.parse(data);
} catch (error) {
	console.error('Gagal membaca atau mengurai txt_toxic.json:', error);
}

const responseMessage = 'Tolong jaga bahasa Anda! 😊 Terdeteksi menggunakan kata kasar.'; // Pesan balasan yang diperbarui
const enableAntitoxic = process.env.ENABLE_ANTITOXIC === 'true'; // Baca nilai dari .env

export async function handleToxicMessage(Wilykun, message) {
	if (!message.message || !message.key.remoteJid) return;

	if (!enableAntitoxic) return; // Tambahkan pengecekan ini

	const text = (message.message.conversation || message.message.extendedTextMessage?.text || '').toLowerCase();
	const containsOffensiveWord = offensiveWords.some(word => text.includes(word.toLowerCase()));

	if (containsOffensiveWord) {
		try {
			const senderJid = message.key.participant || message.key.remoteJid;
			const profilePictureUrl = await retryWithDelay(async () => {
				return await Wilykun.profilePictureUrl(senderJid, 'image');
			}).catch(() => 'https://example.com/default-profile-picture.png');

			const { time: groupCreationTime, creator: groupCreator } = await getGroupCreationTime(Wilykun, message.key.remoteJid);
			const totalAdmins = await getTotalAdmins(Wilykun, message.key.remoteJid);
			const totalMembers = await getTotalMembers(Wilykun, message.key.remoteJid);

			const antitoxicMessage = `
@${senderJid.split('@')[0]} ${responseMessage}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grup ini dibuat pada: ${groupCreationTime} 📅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pembuat grup: @${groupCreator.split('@')[0]} 🧑‍💼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total admin: ${totalAdmins} 👮‍♂️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jumlah anggota: ${totalMembers} 👨‍👩‍👧‍👦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
			`;

			await Wilykun.sendMessage(
				jidNormalizedUser(message.key.remoteJid),
				{
					caption: antitoxicMessage,
					mentions: [senderJid, groupCreator],
					image: { url: profilePictureUrl },
					contextInfo: {
						mentionedJid: [senderJid, groupCreator],
						forwardingScore: 100,
						isForwarded: true,
						forwardedMessage: true,
						forwardedNewsletterMessageInfo: {
							newsletterJid: '120363312297133690@newsletter',
							newsletterName: 'Info Seputar Anime Dll 👤',
							serverMessageId: '143'
						}
					}
				},
				{ quoted: message }
			);
			await retryWithDelay(async () => {
				await Wilykun.sendMessage(jidNormalizedUser(message.key.remoteJid), { delete: message.key });
			}, 3, 1000); // Coba ulangi 3 kali dengan delay 1 detik
			console.log(`Pesan toxic berhasil dihapus: ${text}`);
		} catch (error) {
			console.error('Gagal menghapus pesan toxic:', error);
		}
	} else if (message.message.extendedTextMessage?.contextInfo?.quotedMessage) {
		// Periksa pesan yang menggunakan fitur "read more"
		const quotedText = (message.message.extendedTextMessage.contextInfo.quotedMessage.conversation || '').toLowerCase();
		const containsOffensiveWordInQuoted = offensiveWords.some(word => quotedText.includes(word.toLowerCase()));

		if (containsOffensiveWordInQuoted) {
			try {
				await retryWithDelay(async () => {
					await Wilykun.sendMessage(jidNormalizedUser(message.key.remoteJid), { delete: message.key });
				}, 3, 1000); // Coba ulangi 3 kali dengan delay 1 detik
				console.log(`Pesan toxic dalam "read more" berhasil dihapus: ${quotedText}`);
			} catch (error) {
				console.error('Gagal menghapus pesan toxic dalam "read more":', error);
			}
		}
	}
}

/**
 * Fungsi untuk mendapatkan waktu pembuatan grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @returns {Promise<{time: string, creator: string}>} - Waktu pembuatan grup dalam format yang mudah dibaca dan ID pembuat grup.
 */
const getGroupCreationTime = async (Wilykun, groupId) => {
	const metadata = await retryWithDelay(async () => {
		return await Wilykun.groupMetadata(groupId);
	});
	const creationTime = new Date(metadata.creation * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	return {
		time: creationTime,
		creator: metadata.owner
	};
};

/**
 * Fungsi untuk mendapatkan total jumlah admin dalam grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @returns {Promise<number>} - Total jumlah admin dalam grup.
 */
const getTotalAdmins = async (Wilykun, groupId) => {
	const metadata = await retryWithDelay(async () => {
		return await Wilykun.groupMetadata(groupId);
	});
	return metadata.participants.filter(participant => participant.admin !== null).length;
};

/**
 * Fungsi untuk mendapatkan jumlah anggota dalam grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @returns {Promise<number>} - Jumlah anggota dalam grup.
 */
const getTotalMembers = async (Wilykun, groupId) => {
	const metadata = await retryWithDelay(async () => {
		return await Wilykun.groupMetadata(groupId);
	});
	return metadata.participants.length;
};

export function someFunction() {
	// Function implementation
}
