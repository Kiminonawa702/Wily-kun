import { jidNormalizedUser } from 'baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fungsi untuk mengirim pesan perpisahan saat ada anggota yang keluar dari grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @param {string} participant - ID peserta yang keluar.
 */
export const sendGoodbyeMessage = async (Wilykun, groupId, participant) => {
	const username = jidNormalizedUser(participant).split('@')[0];
	const profilePictureUrl = await Wilykun.profilePictureUrl(participant, 'image').catch(() => 'https://example.com/default-profile-picture.png');
	const goodbyeText = getRandomGoodbyeText();
	const { time: groupCreationTime, creator: groupCreator } = await getGroupCreationTime(Wilykun, groupId);
	const totalAdmins = await getTotalAdmins(Wilykun, groupId);
	const totalMembers = await getTotalMembers(Wilykun, groupId);
	const goodbyeMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Selamat tinggal @${username} 😢
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${goodbyeText}
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
	await retryWithDelay(async () => {
		await Wilykun.sendMessage(groupId, { 
			caption: goodbyeMessage, 
			mentions: [participant, groupCreator],
			image: { url: profilePictureUrl },
			contextInfo: {
				mentionedJid: [participant, groupCreator],
				forwardingScore: 100,
				isForwarded: true,
				forwardedMessage: true,
				forwardedNewsletterMessageInfo: {
					newsletterJid: '120363312297133690@newsletter',
					newsletterName: 'Info Seputar Anime Dll 👤',
					serverMessageId: '143'
				}
			}
		});
	});
};

/**
 * Fungsi untuk mendapatkan teks perpisahan secara acak.
 * @returns {string} - Teks perpisahan yang dipilih secara acak.
 */
const getRandomGoodbyeText = () => {
	const goodbyeTexts = fs.readFileSync(path.join(__dirname, 'goodbye.txt'), 'utf-8').split('\n');
	return goodbyeTexts[Math.floor(Math.random() * goodbyeTexts.length)];
};

/**
 * Fungsi untuk mendapatkan waktu pembuatan grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @returns {Promise<{time: string, creator: string}>} - Waktu pembuatan grup dalam format yang mudah dibaca dan ID pembuat grup.
 */
const getGroupCreationTime = async (Wilykun, groupId) => {
	const metadata = await Wilykun.groupMetadata(groupId);
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
	const metadata = await Wilykun.groupMetadata(groupId);
	return metadata.participants.length;
};

/**
 * Fungsi untuk mencoba kembali dengan delay jika terjadi error rate limit.
 * @param {Function} fn - Fungsi yang akan dicoba kembali.
 * @param {number} retries - Jumlah maksimal percobaan.
 * @param {number} delay - Waktu delay antara percobaan dalam milidetik.
 */
async function retryWithDelay(fn, retries = 3, delay = 1000) {
	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (error) {
			if (error.data === 429 && i < retries - 1) {
				await new Promise(resolve => setTimeout(resolve, delay));
			} else {
				throw error;
			}
		}
	}
}
