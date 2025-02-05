import { retry } from './utils/retry.js'; // Impor fungsi retry
import { warningMessages } from './TEKS_PERINGATAN/teks_peringtan_antiwame.js'; // Impor pesan peringatan
import fs from 'fs';
import path from 'path';

const DATA_DIR = './DATA';
let userWarnings = {};

// Memuat data pelanggaran pengguna dari file
const loadUserWarnings = (groupId) => {
	const dataFile = path.join(DATA_DIR, `${groupId}_userWarnings.json`);
	if (fs.existsSync(dataFile)) {
		const data = fs.readFileSync(dataFile, 'utf-8');
		userWarnings[groupId] = JSON.parse(data);
	} else {
		userWarnings[groupId] = {};
	}
};

// Menyimpan data pelanggaran pengguna ke file
const saveUserWarnings = (groupId) => {
	const dataFile = path.join(DATA_DIR, `${groupId}_userWarnings.json`);
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
	fs.writeFileSync(dataFile, JSON.stringify(userWarnings[groupId], null, 2));
};

// Inisialisasi data pelanggaran pengguna
const initializeUserWarnings = (groupId) => {
	if (!userWarnings[groupId]) {
		loadUserWarnings(groupId);
	}
};

export const handleAntiWaMe = async (Wilykun, message) => {
	if (process.env.ENABLE_ANTIWAME !== 'true') return; // Periksa apakah fitur antiwame diaktifkan

	const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
	const waMeRegex = /https:\/\/wa\.me\/|wa\.me/gi;
	const groupId = message.key.remoteJid;
	const groupName = (await Wilykun.groupMetadata(groupId)).subject;

	if (waMeRegex.test(text) && !message.key.fromMe) {
		try {
			const senderId = message.key.participant || message.key.remoteJid;
			const profilePictureUrl = await Wilykun.profilePictureUrl(senderId, 'image').catch(() => 'https://example.com/default-profile-picture.png');

			// Inisialisasi data pelanggaran untuk grup
			initializeUserWarnings(groupId);

			// Menambah jumlah peringatan untuk pengguna
			if (!userWarnings[groupId][senderId]) {
				userWarnings[groupId][senderId] = 1;
			} else {
				userWarnings[groupId][senderId]++;
			}

			// Menyimpan data pelanggaran pengguna ke file
			saveUserWarnings(groupId);

			// Mendapatkan pesan peringatan yang sesuai
			const warningIndex = Math.min(userWarnings[groupId][senderId] - 1, warningMessages.length - 2);
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

			await retry(() => Wilykun.sendMessage(message.key.remoteJid, notificationMessage, { quoted: message }));
			await retry(() => Wilykun.sendMessage(message.key.remoteJid, { delete: message.key }, { quoted: message }));

			// Mengeluarkan pengguna jika mereka memiliki lebih dari 10 peringatan
			if (userWarnings[groupId][senderId] > 10) {
				await Wilykun.groupParticipantsUpdate(message.key.remoteJid, [senderId], 'remove');
				const kickMessage = warningMessages[warningMessages.length - 1].replace('{user}', senderId.split('@')[0]);
				await retry(() => Wilykun.sendMessage(message.key.remoteJid, { text: kickMessage }));
				delete userWarnings[groupId][senderId]; // Mengatur ulang jumlah peringatan setelah mengeluarkan
				saveUserWarnings(groupId); // Menyimpan perubahan ke file
			}
		} catch (error) {
			console.error('Gagal menghapus pesan link wa.me:', error);
		}
	}
};

// Fungsi untuk menampilkan daftar pengguna yang melanggar aturan
export const listViolators = async (Wilykun, groupId) => {
	initializeUserWarnings(groupId);
	const groupName = (await Wilykun.groupMetadata(groupId)).subject;

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
