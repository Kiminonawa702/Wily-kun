// Fungsi untuk menangani perubahan izin grup
export const handleGroupPermissionChange = async (Wilykun, update, getRandomImage) => {
	const { id, restrict, announce, joinApprovalMode, author } = update;

	if (!author) {
		console.error('No author found for group permission change');
		return;
	}

	const admin = author; // Gunakan author sebagai admin yang mengubah izin grup
	const imageUrl = getRandomImage();
	const { time: groupCreationTime, creator: groupCreator } = await getGroupCreationTime(Wilykun, id);
	const totalAdmins = await getTotalAdmins(Wilykun, id);
	const totalMembers = await getTotalMembers(Wilykun, id);

	let permissionText = '';
	if (restrict !== undefined) {
		permissionText += restrict ? 'Hanya admin yang dapat mengedit pengaturan grup. 🔒\n' : 'Semua anggota dapat mengedit pengaturan grup. 🔓\n';
	}
	if (announce !== undefined) {
		permissionText += announce ? 'Hanya admin yang dapat mengirim pesan. 📢\n' : 'Semua anggota dapat mengirim pesan. 💬\n';
	}
	if (joinApprovalMode !== undefined) {
		permissionText += joinApprovalMode ? 'Persetujuan admin diperlukan untuk menambahkan anggota baru. ✅\n' : 'Anggota dapat ditambahkan tanpa persetujuan admin. ➕\n';
	}

	const message = {
		image: { url: imageUrl },
		caption: `
Izin grup telah diubah oleh @${admin.split('@')[0]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${permissionText}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grup ini dibuat pada: ${groupCreationTime} 📅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pembuat grup: @${groupCreator.split('@')[0]} 🧑‍💼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total admin: ${totalAdmins} 👮‍♂️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jumlah anggota: ${totalMembers} 👨‍👩‍👧‍👦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		`,
		mentions: [admin, groupCreator],
	};

	await Wilykun.sendMessage(id, message);
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
