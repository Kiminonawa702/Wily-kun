import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'DATA/Jumlah_Lihat_Status_Orang.json');

/**
 * Mendapatkan jumlah status yang dilihat dari file.
 * @returns {number} - Jumlah status yang dilihat.
 */
export function getStatusViewCount() {
	try {
		const data = fs.readFileSync(filePath, 'utf-8');
		const json = JSON.parse(data);
		return json.count || 0;
	} catch (err) {
		return 0;
	}
}

/**
 * Menyimpan jumlah status yang dilihat ke file.
 * @param {number} count - Jumlah status yang dilihat.
 */
function saveStatusViewCount(count) {
	const data = { count };
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Menambahkan jumlah status yang dilihat.
 */
export function incrementStatusViewCount() {
	const count = getStatusViewCount();
	saveStatusViewCount(count + 1);
}
