import { retryWithDelay } from '../utils/retry.js'; // Pastikan path ini benar

/**
 * Menangani fitur auto typing.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {object} m - Pesan yang diterima.
 */
export async function handleAutoTyping(Wilykun, m) {
	const enableTyping = process.env.ENABLE_TYPING === 'true';
	const enableRecording = process.env.ENABLE_RECORDING === 'true';
	const markAsReceived = process.env.MARK_AS_RECEIVED === 'true';

	const remoteJid = m?.key?.remoteJid;
	if (!remoteJid) {
		// console.error('remoteJid is undefined');
		return;
	}

	// Show typing or recording status if enabled
	if (enableTyping) {
		await Wilykun.sendPresenceUpdate('composing', remoteJid);
	} else if (enableRecording) {
		await Wilykun.sendPresenceUpdate('recording', remoteJid);
	}

	// Tandai pesan sebagai telah diterima (ceklis dua abu-abu) jika diaktifkan
	if (markAsReceived) {
		await Wilykun.sendPresenceUpdate('available', remoteJid);
	}
}

const setTypingStatus = async (Wilykun, chatId, isTyping) => {
	await retryWithDelay(async () => {
		await Wilykun.sendPresenceUpdate(isTyping ? 'composing' : 'paused', chatId);
	});
};

export function handleAutoRecording(Wilykun, remoteJid) {
	Wilykun.sendPresenceUpdate('recording', remoteJid);
}

export function handleMarkAsReceived(Wilykun, remoteJid) {
	Wilykun.sendPresenceUpdate('available', remoteJid);
}
