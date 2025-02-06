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
import { sendPromotionMessage, sendDemotionMessage } from './FITUR_BY_WILY/PROMOT_DEMOT/promot_demot.js'; // Impor fungsi sendPromotionMessage dan sendDemotionMessage

import treeKill from './lib/tree-kill.js';
import serialize, { Client } from './lib/serialize.js';
import { formatSize, parseFileSize, sendTelegram } from './lib/function.js';
import { autoReactStatus } from './Random_Emot/Reaksi_Emot.js';
import { sendConnectionMessage } from './NOTIFIKASI/hehe.js';
import { incrementStatusViewCount } from './lib/statusViewCounter.js';
import { handleAutoTyping, handleAutoRecording, handleMarkAsReceived } from './FITUR_BY_WILY/Auto_Typing_Ricord_Ceklis_2_no_read.js';
import { updateAutoBio, throttledUpdateAutoBio } from './FITUR_BY_WILY/Auto_Bio_RuntimeBot.js'; // Impor fungsi updateAutoBio dan throttledUpdateAutoBio
import { handleToxicMessage } from './FITUR_BY_WILY/FITUR_ANTI/antitoxic.js'; // Impor fungsi handleToxicMessage
import { handleAntiWaMe, listViolators } from './FITUR_BY_WILY/FITUR_ANTI/antiwame.js'; // Perbaiki jalur impor
import { handleAntiLinkChannel, listChannelViolators } from './antilinkchannel.js'; // Impor fungsi handleAntiLinkChannel dan listChannelViolators

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
const enablePermissionChangeNotification = process.env.ENABLE_PERMISSION_CHANGE_NOTIFICATION === 'true'; // Tambahkan pengaturan enablePermissionChangeNotification
const enablePromotionDemotion = process.env.ENABLE_PROMOTION_DEMOTION === 'true'; // Tambahkan pengaturan enablePromotionDemotion
const enableAntitoxic = process.env.ENABLE_ANTITOXIC === 'true'; // Tambahkan pengaturan enableAntitoxic

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

		const { connection, lastDisconnect } = update;
		if (connection === 'close') {
			const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
			console.log('Connection closed. Reconnecting...', shouldReconnect);
			if (shouldReconnect) {
				startSock();
			} else {
				console.log('Connection closed. Not reconnecting.');
			}
		}
	});

	// write session kang
	Wilykun.ev.on('creds.update', saveCreds);

	// Ensure session directory exists
	if (!fs.existsSync(`./${process.env.SESSION_NAME}`)) {
		fs.mkdirSync(`./${process.env.SESSION_NAME}`, { recursive: true });
	}

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

	// Fungsi debounce untuk membatasi frekuensi log
	function debounce(func, wait) {
		let timeout;
		return function (...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	// Fungsi throttle untuk membatasi frekuensi log
	function throttle(func, limit) {
		let inThrottle;
		return function (...args) {
			if (!inThrottle) {
				func(...args);
				inThrottle = true;
				setTimeout(() => (inThrottle = false), limit);
			}
		};
	}

	// Contoh penggunaan throttle untuk membatasi log
	const logGroupUpdate = throttle((update) => {
		console.log('Group update detected:', update);
	}, 5000); // Batasi log setiap 5 detik

	// nambah perubahan grup ke store
	Wilykun.ev.on('groups.update', updates => {
		for (const update of updates) {
			const id = update.id;
			if (store.groupMetadata[id]) {
				store.groupMetadata[id] = { ...(store.groupMetadata[id] || {}), ...(update || {}) };
			}

			 // Gunakan fungsi throttle untuk membatasi log
			logGroupUpdate(update);

			// Kirim notifikasi perubahan nama grup jika fitur diaktifkan
			if (enableNameChangeNotification && update.subject) {
				handleGroupNameChange(Wilykun, update, getRandomImage);
			}

			// Kirim notifikasi perubahan deskripsi grup jika fitur diaktifkan
			if (enableDescriptionChangeNotification && update.desc) {
				handleGroupDescriptionChange(Wilykun, update, getRandomImage);
			}

			// Kirim notifikasi perubahan izin grup jika fitur diaktifkan
			if (enablePermissionChangeNotification && (update.restrict !== undefined || update.announce !== undefined || update.joinApprovalMode !== undefined)) {
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

		// Kirim pesan promosi atau demosi admin jika fitur diaktifkan
		if (enablePromotionDemotion) {
			if (update.action === 'promote') {
				for (const participant of update.participants) {
					const promoter = update.author || 'unknown';
					await sendPromotionMessage(Wilykun, update.id, participant, promoter);
				}
			} else if (update.action === 'demote') {
				for (const participant of update.participants) {
					const demoter = update.author || 'unknown';
					await sendDemotionMessage(Wilykun, update.id, participant, demoter);
				}
			}
		}
	});

	// bagian pepmbaca status ono ng kene
	Wilykun.ev.on('messages.upsert', async ({ messages }) => {
		if (!messages[0].message) return;
		let m = await serialize(Wilykun, messages[0], store);

		 // Ensure the bot responds automatically in group chats
		if (m.key.remoteJid.endsWith('@g.us')) {
			// Check for wa.me links and delete if found
			await handleAntiWaMe(Wilykun, m);

			// Tampilkan daftar pengguna yang melanggar aturan jika ada perintah khusus
			if (m.message.conversation === '!listviolators') {
				await listViolators(Wilykun, m.key.remoteJid);
			}

			// Check for channel links and delete if found
			await handleAntiLinkChannel(Wilykun, m);

			// Tampilkan daftar pengguna yang melanggar aturan jika ada perintah khusus
			if (m.message.conversation === '!listchannelviolators') {
				await listChannelViolators(Wilykun, m.key.remoteJid);
			}
		}

		// Show typing or recording status if enabled
		if (enableTyping) {
			if (m.key && m.key.remoteJid) {
				await handleAutoTyping(Wilykun, m); // Pastikan await digunakan di sini
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

		// Periksa pesan untuk kata-kata toxic jika fitur diaktifkan
		if (enableAntitoxic) {
			await handleToxicMessage(Wilykun, m);
		 }

		// kanggo kes
		await (await import(`./message.js?v=${Date.now()}`)).default(Wilykun, store, m);
	});

	// Contoh penggunaan handleToxicMessage
	Wilykun.ev.on('messages.upsert', async ({ messages }) => {
		try {
			const message = messages[0];
			await handleToxicMessage(Wilykun, message);
		} catch (error) {
			console.error('Error handling toxic message:', error);
		}
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
			await throttledUpdateAutoBio(Wilykun);
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
