import { Boom } from '@hapi/boom';
import fs from 'fs';
import { exec } from 'child_process';
import treeKill from '../lib/tree-kill.js';
import { jidNormalizedUser } from 'baileys';

/**
 * Mengubah status member grup.
 * @param {Object} store - Store untuk menyimpan metadata grup.
 * @param {Object} update - Pembaruan peserta grup.
 */
export function handleGroupParticipantsUpdate(store, { id, participants, action }) {
	const metadata = store.groupMetadata[id];
	if (metadata) {
		switch (action) {
			case 'add':
			case 'revoked_membership_requests':
				metadata.participants.push(...participants.map(id => ({ id: jidNormalizedUser(id), admin: null })));
				break;
			case 'demote':
			case 'promote':
				for (const participant of metadata.participants) {
					let id = jidNormalizedUser(participant.id);
					if (participants.includes(id)) {
						participant.admin = action === 'promote' ? 'admin' : null;
					}
				}
				break;
			case 'remove':
				metadata.participants = metadata.participants.filter(p => !participants.includes(jidNormalizedUser(p.id)));
				break;
		}
	}
}

/**
 * Menangani alasan disconnect.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {number} reason - Alasan disconnect.
 * @param {Function} startSock - Fungsi untuk memulai ulang socket.
 */
export async function handleDisconnectReason(Wilykun, reason, startSock) {
	switch (reason) {
		case DisconnectReason.multideviceMismatch:
		case DisconnectReason.loggedOut:
		case 403:
			console.error(new Boom(reason)?.output.statusCode);
			await Wilykun.logout();
			fs.rmSync(`./${process.env.SESSION_NAME}`, { recursive: true, force: true });
			exec('npm run stop:pm2', err => {
				if (err) return treeKill(process.pid);
			});
			break;
		default:
			console.error(new Boom(reason)?.output.statusCode);
			await startSock();
	}
}
