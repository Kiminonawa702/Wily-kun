// Fungsi untuk menangani perubahan deskripsi grup
export const handleGroupDescriptionChange = async (Wilykun, update) => {
	const { id, desc, author } = update;

	if (!author) {
		console.error('No author found for group description change');
		return;
	}

	const admin = author; // Gunakan author sebagai admin yang mengubah deskripsi grup
	const profilePictureUrl = await Wilykun.profilePictureUrl(admin, 'image').catch(() => 'https://example.com/default-profile-picture.png');
	const { time: groupCreationTime, creator: groupCreator } = await getGroupCreationTime(Wilykun, id);
	const totalAdmins = await getTotalAdmins(Wilykun, id);
	const totalMembers = await getTotalMembers(Wilykun, id);

	const message = {
		image: { url: profilePictureUrl },
		caption: `
Deskripsi grup telah diubah oleh @${admin.split('@')[0]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grup ini dibuat pada: ${groupCreationTime} 📅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pembuat grup: @${groupCreator.split('@')[0]} 🧑‍💼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total admin: ${totalAdmins} 👮‍♂️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jumlah anggota: ${totalMembers} 👨‍👩‍👧‍👦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deskripsi baru: ${desc}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		`,
		mentions: [admin, groupCreator],
	};

	await retryWithDelay(async () => {
		await Wilykun.sendMessage(id, { 
			caption: message.caption, 
			mentions: message.mentions,
			image: { url: profilePictureUrl },
			contextInfo: {
				mentionedJid: message.mentions,
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
	}).catch(error => {
		if (error.data === 429) {
			console.error('Rate limit exceeded. Please try again later.');
		} else {
			throw error;
		}
	});
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
