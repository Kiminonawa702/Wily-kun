import { jidNormalizedUser } from 'baileys';
import { retryWithDelay } from '../../utils/retry.js'; // Pastikan path ini benar
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

import { toxicWarningMessages, kickMessage } from '../../TEKS_PERINGATAN/teks_peringtan_antitoxic.js'; // Impor pesan peringatan dan pesan kick

const DATA_FILE = './DATA/UserWarningsToxic.json';
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

export const handleToxicMessage = async (Wilykun, message) => {
	if (process.env.ENABLE_ANTITOXIC !== 'true') return; // Periksa apakah fitur antitoxic diaktifkan

	const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
	const toxicWords = offensiveWords; // Gunakan kata-kata toxic dari txt_toxic.json
	const groupId = message.key.remoteJid;
	const groupMetadata = await retryWithDelay(() => Wilykun.groupMetadata(groupId));
	const groupName = groupMetadata?.subject || 'Grup';

	if (toxicWords.some(word => text.includes(word)) && !message.key.fromMe) {
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
			const warningIndex = Math.min(userWarnings[groupId][senderId] - 1, toxicWarningMessages.length - 1);
			const warningMessage = toxicWarningMessages[warningIndex].replace('{user}', senderId.split('@')[0]);

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
				await handleToxicMessage(Wilykun, message); // Coba lagi
			} else {
				console.error('Gagal menghapus pesan toxic:', error);
			}
		}
	}
};

// Fungsi untuk menampilkan daftar pengguna yang melanggar aturan
export const listToxicViolators = async (Wilykun, groupId) => {
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
