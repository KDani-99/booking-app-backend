const cryptoJS = require('crypto-js');
const {ENCRYPTION_KEY} = require('../keys/keys');

if(ENCRYPTION_KEY === null)
{
	return;
}
const {database:ENCRYPTION_KEY_DB} = ENCRYPTION_KEY; // ^dXr2%54A=#X57)-)fk43/X6@P032x{1

var keySize = 256;
var iterations = 100;

/**
 * @param  {string} data plain data to be encrypted
 * @example
 * 
 * var encrypted = encrypt('John Example') ;
 * // => `ab46cf35...`
 * 
 * @return {string}      encrypted data
 */
function encrypt(data) {
	var salt = cryptoJS.lib.WordArray.random(128/8);
 
	var key = cryptoJS.PBKDF2(ENCRYPTION_KEY_DB, salt, {
		keySize: keySize/32,
		iterations: iterations
	  });
 
	var iv = cryptoJS.lib.WordArray.random(128/8);
 
	var encrypted = cryptoJS.AES.encrypt(data, key, {
	  iv: iv,
	  padding: cryptoJS.pad.Pkcs7,
	  mode: cryptoJS.mode.CBC
 
	});
 
	var transitmessage = salt.toString()+ iv.toString() + encrypted.toString();
	return transitmessage;
}

/**
 * @param  {string} enc encrypted data
 * @example
 * 
 * var decrypted = decrypt('ab46f35...');
 * // => `John Example`
 * 
 * @return {string}     decrypted data
 */
function decrypt(enc) {
	var salt = cryptoJS.enc.Hex.parse(enc.substr(0, 32));
	var iv = cryptoJS.enc.Hex.parse(enc.substr(32, 32))
	var encrypted = enc.substring(64);

	var key = cryptoJS.PBKDF2(ENCRYPTION_KEY_DB, salt, {
		keySize: keySize/32,
		iterations: iterations
		});

	var decrypted = cryptoJS.AES.decrypt(encrypted, key, {
		iv: iv,
		padding: cryptoJS.pad.Pkcs7,
		mode: cryptoJS.mode.CBC

	})
	return decrypted.toString(cryptoJS.enc.Utf8);
}
module.exports = { encrypt, decrypt };