import { retryWithDelay } from './utils/retry.js'; // Impor fungsi retryWithDelay
import { warningMessages, kickMessage } from './TEKS_PERINGATAN/tek_peringatan_antilinkchannel.js'; // Impor pesan peringatan dan pesan kick
import fs from 'fs';

const DATA_FILE = './DATA/UserWarningsChannel.json';
let userWarnings = {};

// Memuat data pelanggaran pengguna dari file
const loadUserWarnings = () => {
	if (fs.existsSync(DATA_FILE)) {
		const data = fs.readFileSync(DATA_FILE, 'utf-8');
		userWarnings = JSON.parse(data);
	}
};

// Menyimpan data pelanggaran pengguna ke file
const saveUserWarnings = () => {
	fs.writeFileSync(DATA_FILE, JSON.stringify(userWarnings, null, 2));
};

// Inisialisasi data pelanggaran pengguna
loadUserWarnings();

export const handleAntiLinkChannel = async (Wilykun, message) => {
	if (process.env.ENABLE_ANTILINKCHANNEL !== 'true') return; // Periksa apakah fitur antilinkchannel diaktifkan

	const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
	const linkRegex = /https?:\/\/whatsapp\.com\/channel\/|whatsapp\.com\/channel/gi;
	const groupId = message.key.remoteJid;
	const groupMetadata = await retryWithDelay(() => Wilykun.groupMetadata(groupId));
	const groupName = groupMetadata?.subject || 'Grup';

	if (linkRegex.test(text) && !message.key.fromMe) {
		try {
			const senderId = message.key.participant || message.key.remoteJid;
			const profilePictureUrl = await Wilykun.profilePictureUrl(senderId, 'image').catch(() => 'https://example.com/default-profile-picture.png');

			// Inisialisasi data pelanggaran untuk grup
			if (!userWarnings[groupId]) {
				userWarnings[groupId] = {};
			}

			// Menambah jumlah peringatan untuk pengguna
			if (!userWarnings[groupId][senderId]) {
				userWarnings[groupId][senderId] = 1;
			} else {
				userWarnings[groupId][senderId]++;
			}

			// Menyimpan data pelanggaran pengguna ke file
			saveUserWarnings();

			// Mendapatkan pesan peringatan yang sesuai
			const warningIndex = Math.min(userWarnings[groupId][senderId] - 1, warningMessages.length - 1);
			const warningMessage = warningMessages[warningIndex].replace('{user}', senderId.split('@')[0]);

			// Menambahkan daftar pelanggar ke pesan notifikasi
			let violatorsMessage = `Daftar pengguna yang melanggar aturan di grup ${groupName}:\n-`;
			let mentions = [senderId];

			const sortedViolators = Object.entries(userWarnings[groupId]).sort((a, b) => b[1] - a[1]);

			for (const [userId, count] of sortedViolators) {
				if (count > 0) {
					const userName = userId.split('@')[0];
					violatorsMessage += `\n@${userName} - ${count} pelanggaran 🚫`;
					mentions.push(userId);
				}
			}

			const notificationMessage = {
				image: { url: profilePictureUrl },
				caption: `${warningMessage}\n-\n${violatorsMessage}`,
				mentions
			};

			await retryWithDelay(() => Wilykun.sendMessage(message.key.remoteJid, notificationMessage, { quoted: message }));
			await retryWithDelay(() => Wilykun.sendMessage(message.key.remoteJid, { delete: message.key }, { quoted: message }));

			// Mengeluarkan pengguna jika mereka memiliki lebih dari 10 peringatan
			if (userWarnings[groupId][senderId] > 10) {
				await Wilykun.groupParticipantsUpdate(message.key.remoteJid, [senderId], 'remove');
				const finalKickMessage = kickMessage.replace('{user}', `@${senderId.split('@')[0]}`);
				await retryWithDelay(() => Wilykun.sendMessage(message.key.remoteJid, { text: finalKickMessage, mentions: [senderId] }));
				delete userWarnings[groupId][senderId]; // Mengatur ulang jumlah peringatan setelah mengeluarkan
				saveUserWarnings(); // Menyimpan perubahan ke file
			}
		} catch (error) {
			if (error.message.includes('rate-overlimit')) {
				console.error('Rate limit exceeded. Retrying after delay...');
				await new Promise(resolve => setTimeout(resolve, 10000)); // Tunggu 10 detik sebelum mencoba lagi
				await handleAntiLinkChannel(Wilykun, message); // Coba lagi
			} else {
				console.error('Gagal menghapus pesan link channel:', error);
			}
		}
	}
};

// Fungsi untuk menampilkan daftar pengguna yang melanggar aturan
export const listChannelViolators = async (Wilykun, groupId) => {
	const groupMetadata = await retryWithDelay(() => Wilykun.groupMetadata(groupId));
	const groupName = groupMetadata?.subject || 'Grup';

	let message = `Daftar pengguna yang melanggar aturan di grup ${groupName}:\n-`;
	let mentions = [];

	const sortedViolators = Object.entries(userWarnings[groupId]).sort((a, b) => b[1] - a[1]);

	for (const [userId, count] of sortedViolators) {
		if (count > 0) {
			const userName = userId.split('@')[0];
			message += `\n@${userName} - ${count} pelanggaran 🚫`;
			mentions.push(userId);
		}
	}

	if (mentions.length > 0) {
		await Wilykun.sendMessage(groupId, { text: message, mentions });
	} else {
		await Wilykun.sendMessage(groupId, { text: 'Tidak ada pengguna yang melanggar aturan.' });
	}
};
