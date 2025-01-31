import { jidNormalizedUser } from 'baileys';

/**
 * Fungsi untuk mengirim pesan welcome saat ada anggota baru yang masuk ke grup.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {string} groupId - ID grup.
 * @param {string} participant - ID peserta yang baru masuk.
 */
export const sendWelcomeMessage = async (Wilykun, groupId, participant) => {
	const username = jidNormalizedUser(participant).split('@')[0];
	const profilePictureUrl = await Wilykun.profilePictureUrl(participant, 'image').catch(() => 'https://example.com/default-profile-picture.png');
	const welcomeMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Selamat datang @${username} di grup! 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kami senang Anda bergabung dengan kami. 😊
Semoga Anda betah dan menikmati waktu Anda di sini. 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	`;
	await Wilykun.sendMessage(groupId, { 
		caption: welcomeMessage, 
		mentions: [participant],
		image: { url: profilePictureUrl },
		contextInfo: {
			mentionedJid: [participant],
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
