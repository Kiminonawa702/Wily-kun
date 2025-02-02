import 'dotenv/config';

import makeWASocket, {
	delay,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	makeInMemoryStore,
	jidNormalizedUser,
	DisconnectReason,
	Browsers,
	makeCacheableSignalKeyStore,
} from 'baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { handleConnectionUpdate, displayCFonts } from './ALAMAK/helpers.js'; // Impor fungsi handleConnectionUpdate dan displayCFonts
import { handleDisconnectReason, handleGroupParticipantsUpdate } from './ALAMAK/case.js'; // Impor fungsi handleDisconnectReason dan handleGroupParticipantsUpdate
import { sendWelcomeMessage } from './FITUR_BY_WILY/TEKS_GROUP/welcome.js'; // Impor fungsi sendWelcomeMessage
import { sendGoodbyeMessage } from './FITUR_BY_WILY/TEKS_GROUP/goodbye.js'; // Impor fungsi sendGoodbyeMessage
import { images } from './NOTIFIKASI/Url_Images_Anime.js'; // Impor array images
import { handleGroupNameChange } from './FITUR_BY_WILY/INFO_GROUP/name_gc.js'; // Impor fungsi handleGroupNameChange
import { handleGroupDescriptionChange } from './FITUR_BY_WILY/INFO_GROUP/desripsi_gc.js'; // Impor fungsi handleGroupDescriptionChange
import { handleGroupPermissionChange } from './FITUR_BY_WILY/INFO_GROUP/izin_gc.js'; // Impor fungsi handleGroupPermissionChange

import treeKill from './lib/tree-kill.js';
import serialize, { Client } from './lib/serialize.js';
import { formatSize, parseFileSize, sendTelegram } from './lib/function.js';
import { autoReactStatus } from './Random_Emot/Reaksi_Emot.js';
import { sendConnectionMessage } from './NOTIFIKASI/hehe.js';
import { incrementStatusViewCount } from './lib/statusViewCounter.js';
import { handleAutoTyping, handleAutoRecording, handleMarkAsReceived } from './FITUR_BY_WILY/Auto_Typing_Ricord_Ceklis_2_no_read.js';
import { updateAutoBio } from './FITUR_BY_WILY/Auto_Bio_RuntimeBot.js';

const logger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` }).child({ class: 'Wilykun' });
logger.level = 'fatal';

const usePairingCode = process.env.PAIRING_NUMBER;
const store = makeInMemoryStore({ logger });

if (process.env.WRITE_STORE === 'true') store.readFromFile(`./${process.env.SESSION_NAME}/store.json`);

// check available file
const pathContacts = `./${process.env.SESSION_NAME}/contacts.json`;
const pathMetadata = `./${process.env.SESSION_NAME}/groupMetadata.json`;

const enableTyping = process.env.ENABLE_TYPING === 'true';
const enableRecording = process.env.ENABLE_RECORDING === 'true';
const markAsReceived = process.env.MARK_AS_RECEIVED === 'true';
const enableWelcome = process.env.ENABLE_WELCOME === 'true'; // Tambahkan pengaturan enableWelcome
const enableGoodbye = process.env.ENABLE_GOODBYE === 'true'; // Tambahkan pengaturan enableGoodbye
const enableAutoBio = process.env.ENABLE_AUTO_BIO === 'true';
const enableNameChangeNotification = process.env.ENABLE_NAME_CHANGE_NOTIFICATION === 'true'; // Tambahkan pengaturan enableNameChangeNotification
const enableDescriptionChangeNotification = process.env.ENABLE_DESCRIPTION_CHANGE_NOTIFICATION === 'true'; // Tambahkan pengaturan enableDescriptionChangeNotification
const enableTemporaryMessageChangeNotification = process.env.ENABLE_TEMPORARY_MESSAGE_CHANGE_NOTIFICATION === 'true'; // Tambahkan pengaturan enableTemporaryMessageChangeNotification

const startSock = async () => {
	const { state, saveCreds } = await useMultiFileAuthState(`./${process.env.SESSION_NAME}`);
	const { version, isLatest } = await fetchLatestBaileysVersion();

	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

	/**
	 * @type {import('baileys').WASocket}
	 */
	const Wilykun = makeWASocket.default({
		version,
		logger,
		printQRInTerminal: !usePairingCode,
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		browser: Browsers.ubuntu('Chrome'),
		markOnlineOnConnect: false,
		generateHighQualityLinkPreview: true,
		syncFullHistory: true,
		retryRequestDelayMs: 10,
		transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
		defaultQueryTimeoutMs: undefined,
		maxMsgRetryCount: 15,
		appStateMacVerification: {
			patch: true,
			snapshot: true,
		},
		getMessage: async key => {
			const jid = jidNormalizedUser(key.remoteJid);
			const msg = await store.loadMessage(jid, key.id);

			return msg?.message || '';
		},
		shouldSyncHistoryMessage: msg => {
			console.log(`\x1b[32mMemuat Chat [${msg.progress}%]\x1b[39m`);
			return !!msg.syncType;
		},
	});

	store.bind(Wilykun.ev);
	await Client({ Wilykun, store });

	// login dengan pairing
	if (usePairingCode && !Wilykun.authState.creds.registered) {
		try {
			let phoneNumber = usePairingCode.replace(/[^0-9]/g, '');

			await delay(3000);
			let code = await Wilykun.requestPairingCode(phoneNumber);
			console.log(`\x1b[32m${code?.match(/.{1,4}/g)?.join('-') || code}\x1b[39m`);
		} catch {
			console.error('Gagal mendapatkan kode pairing');
			process.exit(1);
		}
	}

	// ngewei info, restart or close
	Wilykun.ev.on('connection.update', async update => {
		await handleConnectionUpdate(Wilykun, update, startSock); // Gunakan fungsi handleConnectionUpdate
	});

	// write session kang
	Wilykun.ev.on('creds.update', saveCreds);

	// contacts
	if (fs.existsSync(pathContacts)) {
		store.contacts = JSON.parse(fs.readFileSync(pathContacts, 'utf-8'));
	} else {
		fs.writeFileSync(pathContacts, JSON.stringify({}));
	}
	// group metadata
	if (fs.existsSync(pathMetadata)) {
		store.groupMetadata = JSON.parse(fs.readFileSync(pathMetadata, 'utf-8'));
	} else {
		fs.writeFileSync(pathMetadata, JSON.stringify({}));
	}

	// add contacts update to store
	Wilykun.ev.on('contacts.update', update => {
		for (let contact of update) {
			let id = jidNormalizedUser(contact.id);
			if (store && store.contacts) store.contacts[id] = { ...(store.contacts?.[id] || {}), ...(contact || {}) };
		}
	});

	// add contacts upsert to store
	Wilykun.ev.on('contacts.upsert', update => {
		for (let contact of update) {
			let id = jidNormalizedUser(contact.id);
			if (store && store.contacts) store.contacts[id] = { ...(contact || {}), isContact: true };
		}
	});

	// Fungsi untuk mendapatkan gambar acak
	const getRandomImage = () => {
		return images[Math.floor(Math.random() * images.length)];
	};

	// nambah perubahan grup ke store
	Wilykun.ev.on('groups.update', updates => {
		for (const update of updates) {
			const id = update.id;
			if (store.groupMetadata[id]) {
				store.groupMetadata[id] = { ...(store.groupMetadata[id] || {}), ...(update || {}) };
			}

			// Log untuk debugging
			console.log('Group update detected:', update);

			// Kirim notifikasi perubahan nama grup jika fitur diaktifkan
			if (enableNameChangeNotification && update.subject) {
				handleGroupNameChange(Wilykun, update, getRandomImage);
			}

			// Kirim notifikasi perubahan deskripsi grup jika fitur diaktifkan
			if (enableDescriptionChangeNotification && update.desc) {
				handleGroupDescriptionChange(Wilykun, update, getRandomImage);
			}

			// Kirim notifikasi perubahan izin grup jika fitur diaktifkan
			if (update.restrict !== undefined || update.announce !== undefined || update.joinApprovalMode !== undefined) {
				handleGroupPermissionChange(Wilykun, update, getRandomImage);
			}
		}
	});

	// merubah status member
	Wilykun.ev.on('group-participants.update', async update => {
		handleGroupParticipantsUpdate(store, update); // Gunakan fungsi handleGroupParticipantsUpdate

		// Kirim pesan welcome jika fitur diaktifkan
		if (enableWelcome && update.action === 'add') {
			for (const participant of update.participants) {
				await sendWelcomeMessage(Wilykun, update.id, participant);
			}
		}

		// Kirim pesan goodbye jika fitur diaktifkan
		if (enableGoodbye && update.action === 'remove') {
			for (const participant of update.participants) {
				try {
					await sendGoodbyeMessage(Wilykun, update.id, participant);
				} catch (error) {
					console.error('Failed to send goodbye message:', error);
				}
			}
		}
	});

	// bagian pepmbaca status ono ng kene
	Wilykun.ev.on('messages.upsert', async ({ messages }) => {
		if (!messages[0].message) return;
		let m = await serialize(Wilykun, messages[0], store);

		// Show typing or recording status if enabled
		if (enableTyping) {
			if (m.key && m.key.remoteJid) {
				handleAutoTyping(Wilykun, m);
			} else {
				// console.error('m.key or m.key.remoteJid is undefined');
			}
		} else if (enableRecording) {
			if (m.key && m.key.remoteJid) {
				handleAutoRecording(Wilykun, m.key.remoteJid);
			} else {
				// console.error('m.key or m.key.remoteJid is undefined');
			}
		}

		// Tandai pesan sebagai telah diterima (ceklis dua abu-abu) jika diaktifkan
		if (markAsReceived) {
			if (m.key && m.key.remoteJid) {
				handleMarkAsReceived(Wilykun, m.key.remoteJid);
			} else {
				// console.error('m.key or m.key.remoteJid is undefined');
			}
		}

		// nambah semua metadata ke store
		if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0) store.groupMetadata = await Wilykun.groupFetchAllParticipating();

		// untuk membaca pesan status
		if (m.key && !m.key.fromMe && m.key.remoteJid === 'status@broadcast') {
			if (m.type === 'protocolMessage' && m.message.protocolMessage.type === 0) return;
			await Wilykun.readMessages([m.key]);
			await autoReactStatus(Wilykun, m);
			onStatusView(); // Panggil fungsi onStatusView saat bot melihat status
		}

		// status self apa publik
		if (process.env.SELF === 'true' && !m.isOwner) return;

		// kanggo kes
		await (await import(`./message.js?v=${Date.now()}`)).default(Wilykun, store, m);
	});

	setInterval(async () => {
		// write contacts and metadata
		if (store.groupMetadata) fs.writeFileSync(pathMetadata, JSON.stringify(store.groupMetadata));
		if (store.contacts) fs.writeFileSync(pathContacts, JSON.stringify(store.contacts));

		// write store
		if (process.env.WRITE_STORE === 'true') store.writeToFile(`./${process.env.SESSION_NAME}/store.json`);

		// untuk auto restart ketika RAM sisa sesuai threshold di .env
		if (process.env.AUTO_RESTART === 'true') {
			const memoryUsage = os.totalmem() - os.freemem();
			const autoRestartThreshold = parseFileSize(process.env.AUTO_RESTART_THRESHOLD || '300MB', false);

			if (memoryUsage > os.totalmem() - autoRestartThreshold) {
				await Wilykun.sendMessage(
					jidNormalizedUser(Wilykun.user.id),
					{ text: `penggunaan RAM mencapai *${formatSize(memoryUsage)}* waktunya merestart...` },
					{ ephemeralExpiration: 24 * 60 * 60 * 1000 }
				);
				exec('npm run restart:pm2', err => {
					if (err) return process.send('reset');
				});
			}
		}

		// Perbarui bio WhatsApp dengan waktu uptime bot jika ENABLE_AUTO_BIO diaktifkan
		if (enableAutoBio && Wilykun.ws.readyState === Wilykun.ws.OPEN) {
			await updateAutoBio(Wilykun);
		} else if (!enableAutoBio) {
			// Fitur auto bio dinonaktifkan, tidak perlu log
		} else {
			console.error('Connection is not open. Skipping bio update.');
		}
	}, 10 * 1000); // tiap 10 detik

	process.on('uncaughtException', console.error);
	process.on('unhandledRejection', console.error);
};

/**
 * Fungsi yang dipanggil saat bot melihat status orang.
 */
function onStatusView() {
	incrementStatusViewCount();
}

startSock();
