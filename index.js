import path from 'path';
import { spawn } from 'child_process';
import { watchFile, unwatchFile, writeFileSync, readFileSync } from 'fs';
import { config } from 'dotenv';
import { exec } from 'child_process';
import chalk from 'chalk';
import fetch from 'node-fetch'; // Pastikan node-fetch diimpor dengan benar
import readline from 'readline'; // Tambahkan ini untuk membaca input dari pengguna
import os from 'os'; // Tambahkan ini untuk mengimpor modul os

import treeKill from './lib/tree-kill.js';

config(); // Load .env file

let activeProcess = null;
let currentUsername = null;
let currentPassword = null;

/**
 * Membaca input dari pengguna.
 * @param {string} query - Pertanyaan yang akan ditampilkan kepada pengguna.
 * @param {boolean} isPassword - Apakah input adalah password.
 * @returns {Promise<string>} - Input dari pengguna.
 */
function askQuestion(query, isPassword = false) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true
	});

	if (isPassword) {
		rl.stdoutMuted = true;
		rl._writeToOutput = function _writeToOutput(stringToWrite) {
			if (rl.stdoutMuted) {
				rl.output.write("\x1B[2K\x1B[200D" + query + "*".repeat(rl.line.length));
			} else {
				rl.output.write(stringToWrite);
			}
		};
	}

	return new Promise(resolve => rl.question(query, ans => {
		rl.close();
		resolve(ans.trim()); // Gunakan trim() untuk menghapus spasi yang tidak diinginkan
	}));
}

/**
 * Memilih dua warna acak dari daftar warna yang didukung oleh chalk.
 * @param {string} text - Teks yang akan diwarnai.
 * @returns {string} - Teks yang diwarnai dengan dua warna acak.
 */
function randomColor(text) {
	const colors = [
		'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
		'gray', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
		'magentaBright', 'cyanBright', 'whiteBright'
	];
	const randomColor1 = colors[Math.floor(Math.random() * colors.length)];
	const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
	return chalk[randomColor1](chalk[randomColor2](text));
}

/**
 * Memeriksa username dan password dari URL.
 * @returns {Promise<{username: string, password: string}>} - Username dan password yang valid.
 */
async function checkCredentials() {
	const response = await fetch('https://raw.githubusercontent.com/kanayabighael/WilyKun/refs/heads/main/ALAMAK.js');
	const credentials = await response.text();
	const validUsername = credentials.match(/USERNAME=(.*)/)[1].trim();
	const validPassword = credentials.match(/PASSWORD=(.*)/)[1].trim();
	return { username: validUsername, password: validPassword };
}

/**
 * Memeriksa perubahan pada username dan password.
 * @returns {Promise<boolean>} - Apakah ada perubahan pada username dan password.
 */
async function checkForCredentialChanges() {
	const { username: validUsername, password: validPassword } = await checkCredentials();
	return currentUsername !== validUsername || currentPassword !== validPassword;
}

/**
 * Menyimpan username dan password ke file.
 * @param {string} username - Username yang valid.
 * @param {string} password - Password yang valid.
 */
function saveCredentials(username, password) {
	const data = { username, password };
	writeFileSync('username_password.json', JSON.stringify(data, null, 2));
}

/**
 * Memeriksa username dan password dari file.
 * @returns {{username: string, password: string}} - Username dan password dari file.
 */
function getSavedCredentials() {
	try {
		const data = readFileSync('username_password.json');
		return JSON.parse(data);
	} catch (err) {
		return null;
	}
}

/**
 * Memeriksa username dan password dari URL.
 * @param {Function} callback - Fungsi yang akan dipanggil setelah autentikasi selesai.
 */
async function authenticate(callback) {
	const { username: validUsername, password: validPassword } = await checkCredentials();
	const savedCredentials = getSavedCredentials();

	if (savedCredentials && (savedCredentials.username !== validUsername || savedCredentials.password !== validPassword)) {
		console.log('--------------------------------------------------');
		console.log(randomColor('⚠️ Username dan password yang tersimpan di file'));
		console.log(randomColor('username_password.json telah diubah dan tidak dapat'));
		console.log(randomColor('digunakan lagi.'));
		console.log('--------------------------------------------------');
		currentUsername = null;
		currentPassword = null;
	}

	if (currentUsername !== validUsername || currentPassword !== validPassword) {
		currentUsername = validUsername;
		currentPassword = validPassword;

		if (savedCredentials && savedCredentials.username === validUsername && savedCredentials.password === validPassword) {
			console.log('--------------------------------------------------');
			console.log(chalk.black(chalk.bgGreen('✅ Autentikasi berhasil menggunakan kredensial yang tersimpan.')));
			console.log('--------------------------------------------------');
			callback();
		} else {
			console.log('--------------------------------------------------'); // Tambahkan garis pemisah
			console.log('Meminta input username...');
			const username = await askQuestion(chalk.black(chalk.bgGreen('USERNAME: ')));
			console.log('--------------------------------------------------'); // Tambahkan garis pemisah
			console.log('Meminta input password...');
			const password = await askQuestion(chalk.black(chalk.bgGreen('PASSWORD: ')), true);

			console.log(''); // Tambahkan baris baru untuk memisahkan prompt dan pesan kesalahan

			if (username === validUsername && password === validPassword) {
				saveCredentials(username, password); // Simpan kredensial yang valid
				callback();
			} else {
				console.error(randomColor('AUTENTIKASI GAGAL. USERNAME ATAU PASSWORD TIDAK VALID.'));
				process.exit(1); // Bot mati jika autentikasi gagal
			}
		}
	} else {
		callback();
	}
}

/**
 * Memulai proses baru atau menghentikan proses yang sedang berjalan dan memulai ulang.
 * @param {string} file - Nama file yang akan dijalankan.
 */
function start(file) {
	if (activeProcess) {
		treeKill(activeProcess.pid, 'SIGTERM', err => {
			if (err) {
				console.error('Error stopping process:', err);
			} else {
				console.log('--------------------------------------------------');
				console.log('Process stopped.');
				console.log('--------------------------------------------------');
				activeProcess = null;
				start(file);
			}
		});
	} else {
		console.log('--------------------------------------------------');
		console.log('Starting . . .');
		console.log('--------------------------------------------------');
		let args = [path.join(process.cwd(), file), ...process.argv.slice(2)];
		let p = spawn(process.argv[0], args, { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] })
			.on('message', data => {
				console.log('--------------------------------------------------');
				console.log('[RECEIVED]', data);
				console.log('--------------------------------------------------');
				switch (data) {
					case 'reset':
						start(file);
						break;
					case 'uptime':
						p.send(process.uptime());
						break;
				}
			})
			.on('exit', code => {
				console.log('--------------------------------------------------');
				console.error('Exited with code:', code);
				console.log('--------------------------------------------------');
				if (Number(code) && code === 0) return;
				if (code === 1) {
					console.log('--------------------------------------------------');
					console.log('Restarting due to exit code 1...');
					console.log('--------------------------------------------------');
					setTimeout(() => start(file), 5000); // Restart after 5 seconds
					return;
				}
				watchFile(args[0], () => {
					unwatchFile(args[0]);
					start(file);
				});
			})
			.on('error', err => {
				console.log('--------------------------------------------------');
				console.error('Failed to start process:', err);
				console.log('--------------------------------------------------');
				// Hapus bagian yang menangani ERR_MODULE_NOT_FOUND
				console.log('--------------------------------------------------');
				console.error('An unexpected error occurred:', err);
				console.log('--------------------------------------------------');
				setTimeout(() => start(file), 5000); // Restart after 5 seconds
			});

		activeProcess = p;

		// Periksa perubahan kredensial setiap 1 menit
		setInterval(async () => {
			const credentialsChanged = await checkForCredentialChanges();
			if (credentialsChanged) {
				console.log('--------------------------------------------------');
				console.log(chalk.black(chalk.bgGreen('⚠️ Maaf, username dan password telah diubah oleh owner Wilykun. Terima kasih. 🙏')));
				treeKill(activeProcess.pid, 'SIGTERM', err => {
					if (err) {
						console.error('Error stopping process:', err);
					} else {
						console.log('--------------------------------------------------');
						console.log(chalk.black(chalk.bgGreen('Process stopped due to credential change.')));
						console.log('--------------------------------------------------');
						process.exit(1);
					}
				});
			}
		}, 60000); // 1 menit
	}
}

// Panggil fungsi authenticate sebelum memulai proses
authenticate(() => start('Wilykun.js'));