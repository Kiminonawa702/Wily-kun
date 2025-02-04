import fs from 'fs';
import path from 'path';

/**
 * Fungsi untuk menghapus file di dalam folder sesi secara otomatis, kecuali file creds.json.
 * @param {string} sessionFolder - Path ke folder sesi.
 */
export const autoClearSession = (sessionFolder) => {
	try {
		if (fs.existsSync(sessionFolder)) {
			fs.readdirSync(sessionFolder).forEach(file => {
				const filePath = path.join(sessionFolder, file);
				if (file === 'creds.json') {
					// Jangan hapus file creds.json
					return;
				}
				if (fs.lstatSync(filePath).isDirectory()) {
					fs.rmSync(filePath, { recursive: true, force: true });
				} else {
					fs.unlinkSync(filePath);
				}
			});
			console.log(`File di dalam folder sesi ${sessionFolder} berhasil dihapus.`);
		}
	} catch (error) {
		console.error(`Gagal menghapus file di dalam folder sesi ${sessionFolder}:`, error);
	}
};
