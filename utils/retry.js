export const retry = async (fn, retries = 3, delayMs = 1000) => {
	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (error) {
			if (i === retries - 1) throw error;
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
	}
};

/**
 * Fungsi untuk mencoba kembali dengan penundaan jika terjadi kesalahan.
 * @param {Function} fn - Fungsi yang akan dicoba kembali.
 * @param {number} retries - Jumlah maksimal percobaan.
 * @param {number} delayMs - Waktu penundaan antara percobaan dalam milidetik.
 * @returns {Promise<any>} - Hasil dari fungsi yang dicoba kembali.
 */
export const retryWithDelay = async (fn, retries = 3, delayMs = 1000) => {
	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (err) {
			if (i === retries - 1 || err.message.includes('rate-overlimit')) {
				throw err;
			}
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
	}
};