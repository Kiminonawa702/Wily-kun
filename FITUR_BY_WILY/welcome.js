import { jidNormalizedUser } from 'baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fungsi untuk mengirim pesan welcome saat ada anggota baru yang masuk ke grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @param {string} participant - ID peserta yang baru masuk.
 */
export const sendWelcomeMessage = async (Wilykun, groupId, participant) => {
	const username = jidNormalizedUser(participant).split('@')[0];
	const profilePictureUrl = await Wilykun.profilePictureUrl(participant, 'image').catch(() => 'https://example.com/default-profile-picture.png');
	const { time: groupCreationTime, creator: groupCreator } = await getGroupCreationTime(Wilykun, groupId);
	const totalAdmins = await getTotalAdmins(Wilykun, groupId);
	const totalMembers = await getTotalMembers(Wilykun, groupId);
	const welcomeText = getRandomWelcomeText();
	const welcomeMessage = `
----------------------------------------
Selamat datang @${username} di grup! 🎉
----------------------------------------
${welcomeText}
----------------------------------------
Grup ini dibuat pada: ${groupCreationTime} 📅
Pembuat grup: @${jidNormalizedUser(groupCreator).split('@')[0]} 👤
Total admin: ${totalAdmins} 👥
Jumlah anggota: ${totalMembers} 👥
----------------------------------------
	`;
	await Wilykun.sendMessage(groupId, { 
		caption: welcomeMessage, 
		mentions: [participant, groupCreator],
		image: { url: profilePictureUrl },
		contextInfo: {
			mentionedJid: [participant, groupCreator],
			forwardingScore: 100,
			isForwarded: true,
			forwardedMessage: true,
			forwardedNewsletterMessageInfo: {
				newsletterJid: '120363312297133690@newsletter',
				newsletterName: 'Info Anime Dll',
				serverMessageId: '143'
			}
		}
	});
};

/**
 * Fungsi untuk mendapatkan teks selamat datang secara acak.
 * @returns {string} - Teks selamat datang yang dipilih secara acak.
 */
const getRandomWelcomeText = () => {
	const welcomeTexts = fs.readFileSync(path.join(__dirname, 'TEKS_GROUP', 'welcome.txt'), 'utf-8').split('\n');
	return welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)];
};

/**
 * Fungsi untuk mendapatkan waktu pembuatan grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @returns {Promise<string>} - Waktu pembuatan grup dalam format yang mudah dibaca.
 */
const getGroupCreationTime = async (Wilykun, groupId) => {
	const metadata = await Wilykun.groupMetadata(groupId);
	const creationTime = new Date(metadata.creation * 1000);
	return {
		time: creationTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
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
	const metadata = await Wilykun.groupMetadata(groupId);
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
