import { jidNormalizedUser } from 'baileys';
import { retryWithDelay } from '../utils/retry.js'; // Pastikan path ini benar
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const offensiveWords = JSON.parse(fs.readFileSync(path.join(__dirname, '../../DATA/txt_toxic.json'), 'utf-8'));
const responseMessage = 'Jaga bahasa ya! 😊';

export async function handleToxicMessage(Wilykun, message) {
	if (!message.message || !message.key.remoteJid) return;

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

			const goodbyeMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${responseMessage}
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
					caption: goodbyeMessage,
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
			await Wilykun.sendMessage(
				jidNormalizedUser(message.key.remoteJid),
				{ delete: message.key }
			);
		} catch (error) {
			console.error('Gagal menghapus pesan toxic:', error);
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
