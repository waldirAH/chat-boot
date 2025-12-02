#!/usr/bin/env node
const botLogic = require('../lib/bot_logic');

botLogic.loadKB();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso: node bin/eval-cli.js "mensaje del cliente"');
  process.exit(0);
}

const text = args.join(' ');
const resp = botLogic.evaluateMessage(text, { whatsappLink: process.env.WHATSAPP_LINK });
console.log('Cliente:', text);
console.log('Bot:', resp);
