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

	// nambah perubahan grup ke store
	Wilykun.ev.on('groups.update', updates => {
		for (const update of updates) {
			const id = update.id;
			if (store.groupMetadata[id]) {
				store.groupMetadata[id] = { ...(store.groupMetadata[id] || {}), ...(update || {}) };
			}
		}
	});

	// merubah status member
	Wilykun.ev.on('group-participants.update', update => {
		handleGroupParticipantsUpdate(store, update); // Gunakan fungsi handleGroupParticipantsUpdate
	});

	// bagian pepmbaca status ono ng kene
	Wilykun.ev.on('messages.upsert', async ({ messages }) => {
		if (!messages[0].message) return;
		let m = await serialize(Wilykun, messages[0], store);

		// Show typing or recording status if enabled
		if (enableTyping) {
			handleAutoTyping(Wilykun, m.key.remoteJid);
		} else if (enableRecording) {
			handleAutoRecording(Wilykun, m.key.remoteJid);
		}

		// Tandai pesan sebagai telah diterima (ceklis dua abu-abu) jika diaktifkan
		if (markAsReceived) {
			handleMarkAsReceived(Wilykun, m.key.remoteJid);
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

		// untuk auto restart ketika RAM sisa 300MB
		const memoryUsage = os.totalmem() - os.freemem();

		if (memoryUsage > os.totalmem() - parseFileSize(process.env.AUTO_RESTART, false)) {
			await Wilykun.sendMessage(
				jidNormalizedUser(Wilykun.user.id),
				{ text: `penggunaan RAM mencapai *${formatSize(memoryUsage)}* waktunya merestart...` },
				{ ephemeralExpiration: 24 * 60 * 60 * 1000 }
			);
			exec('npm run restart:pm2', err => {
				if (err) return process.send('reset');
			});
		}

		// Perbarui bio WhatsApp dengan waktu uptime bot
		await updateAutoBio(Wilykun);
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
