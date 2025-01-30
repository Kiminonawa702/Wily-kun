import { Boom } from '@hapi/boom';
import fs from 'fs';
import { exec } from 'child_process';
import { jidNormalizedUser } from 'baileys';
import treeKill from '../lib/tree-kill.js';
import { sendConnectionMessage } from '../NOTIFIKASI/hehe.js';
import cfonts from 'cfonts';

// Tambahkan definisi DisconnectReason
const DisconnectReason = {
	CONNECTION_CLOSED: 'connection closed',
	CONNECTION_LOST: 'connection lost',
	CONNECTION_REPLACED: 'connection replaced',
	LOGGED_OUT: 'logged out',
	// Tambahkan alasan lain jika diperlukan
};

/**
 * Menampilkan teks dengan cfonts.
 */
export function displayCFonts() {
	cfonts.say('auto-read-sw\nby-wily-kun', {
		font: 'tiny',
		align: 'center',
		colors: ['system'],
		background: 'transparent',
		letterSpacing: 1,
		lineHeight: 1,
		space: true,
		maxLength: '0',
		gradient: false,
		independentGradient: false,
		transitionGradient: false,
		env: 'node'
	});
}

/**
 * Menangani pembaruan koneksi.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {Object} update - Pembaruan koneksi.
 * @param {Function} startSock - Fungsi untuk memulai ulang socket.
 */
export async function handleConnectionUpdate(Wilykun, update, startSock) {
	const { lastDisconnect, connection } = update;

	if (connection) {
		console.info(`Connection Status : ${connection}`);
	}

	if (connection === 'close') {
		let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

		switch (reason) {
			case DisconnectReason.multideviceMismatch:
			case DisconnectReason.loggedOut:
			case 403:
				console.error(lastDisconnect.error?.message);
				await Wilykun.logout();
				fs.rmSync(`./${process.env.SESSION_NAME}`, { recursive: true, force: true });
				exec('npm run stop:pm2', err => {
					if (err) return treeKill(process.pid);
				});
				break;
			default:
				console.error(lastDisconnect.error?.message);
				await startSock();
		}
	}

	if (connection === 'open') {
		sendConnectionMessage(Wilykun); // Panggil fungsi sendConnectionMessage
		displayCFonts(); // Panggil fungsi displayCFonts
	}
}
