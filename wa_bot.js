const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const botLogic = require('./lib/bot_logic');

// Load KB (bot logic loads with console error if missing)
botLogic.loadKB();

const SYSTEM_PROMPT = 'Eres un ingeniero agrónomo experto que trabaja para Agro Montes. Sé amable, técnico pero entendible, y siempre enfocado en solucionar problemas del campo.';
const WHATSAPP_LINK = process.env.WHATSAPP_LINK || 'https://wa.me/51921450162';

// Bot logic uses its own ruleset; keep WA code focused on I/O handling

// We'll use botLogic.evaluateMessage — it loads the KB and provides better matching (including fuzzy match)

// ---- WhatsApp client ----

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  }
});
// In-memory sessions: { [userId]: { stage: 'awaiting_name'|'menu_shown', name: string } }
const sessions = new Map();

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { state: 'new', name: null });
  }
  return sessions.get(userId);
}

function setSession(userId, s) {
  sessions.set(userId, s);
}

function isLikelyName(text) {
  if (!text) return false;
  const t = text.trim();
  // If contains digits or common keywords, it's not a name
  if (/\d/.test(t)) return false;
  const lowered = t.toLowerCase();
  const stopWords = ['hola','buenos','buenas','menu','fito','nutri','bio','precio','cuanto','cuánto','necesito','tengo','ayuda','gracias'];
  for (const w of stopWords) if (lowered.includes(w)) return false;
  // short-ish (name) and mostly letters & spaces
  if (t.length < 40 && /^[A-Za-záéíóúüñÁÉÍÓÚÜÑ\s]+$/.test(t)) return true;
  return false;
}

const SHIPPING_TERMS = ['envio', 'envíos', 'envios', 'envío', 'enviar', 'envían', 'envien', 'envían', 'envio a', 'envío a', 'hacen envio', 'realizan envio'];

function containsShipping(text) {
  const n = botLogic.normalizeText(text);
  return SHIPPING_TERMS.some(t => n.includes(botLogic.normalizeText(t)));
}

function buildWelcomeMenu(name = '') {
  const greet = name ? `¡Hola ${name}! ` : '👋 ';
  return (
    `${greet}👋 ¡Bienvenido a AGRO MONTES! Soluciones innovadoras para la rentabilidad de tu cultivo. 🇵🇪\n` +
    `Soy un asistente virtual agrónomo de AGRO MONTES, listo para ayudarte con tu cultivo.\n\n` +
    'Por favor, elige una opción del menú:\n\n' +
    '1️⃣ Fitoprotectores (Control de Plagas y Enfermedades)\n' +
    '2️⃣ Nutrientes (Fertilización Foliar)\n' +
    '3️⃣ Bioestimulantes (Algas y Aminoácidos)\n' +
    '4️⃣ Mayor Productividad (Cosecha, Peso y Calibre) 🚀\n' +
    '5️⃣ Reguladores y Coadyuvantes (pH y Adherentes) 💧\n' +
    '6️⃣ Asesoría Técnica (Hablar con un Ingeniero)'
  );
}

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('¡Escanea este QR con tu WhatsApp!');
});

client.on('ready', () => {
  console.log('¡El Bot de Agro Montes está listo!');
});

client.on('message', async message => {
  try {
    const text = message.body || '';
    if (!text) return;

    const msg = botLogic.normalizeText(text);

    // Detect a direct name in the greeting, e.g. 'Hola, soy Carlos' and set session
    const nameDirect = text.match(/(?:soy|me llamo|mi nombre es)\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ\s]+)/i);
    if (!sessions.has(message.from) && nameDirect && nameDirect[1]) {
      const providedName = nameDirect[1].trim();
      sessions.set(message.from, { stage: 'menu_shown', name: providedName });
      await message.reply(buildWelcomeMenu(providedName));
      return;
    }

    // Keep small command for legacy
    if (msg === '!hola' || text.toLowerCase() === '!hola') {
      await message.reply('👋 ¡Hola! Soy el asistente virtual de AGRO MONTES. ¿Cómo te llamas?');
      sessions.set(message.from, { stage: 'awaiting_name' });
      return;
    }

    // If we are awaiting a name from this user, treat the incoming text as the name
    const session = sessions.get(message.from);
    if (session && session.stage === 'awaiting_name') {
      const providedName = text.trim();
      session.name = providedName;
      session.stage = 'menu_shown';
      sessions.set(message.from, session);

      await message.reply(
        `👋 ¡Bienvenido a AGRO MONTES, ${providedName}! Soluciones innovadoras para la rentabilidad de tu cultivo. 🇵🇪\n\n` +
        'Por favor, elige una opción del menú:\n\n' +
        '1️⃣ Fitoprotectores (Control de Plagas y Enfermedades)\n' +
        '2️⃣ Nutrientes (Fertilización Foliar)\n' +
        '3️⃣ Bioestimulantes (Algas y Aminoácidos)\n' +
        '4️⃣ Mayor Productividad (Cosecha, Peso y Calibre) 🚀\n' +
        '5️⃣ Reguladores y Coadyuvantes (pH y Adherentes) 💧\n' +
        '6️⃣ Asesoría Técnica (Hablar con un Ingeniero)'
      );
      return;
    }

    // If we are awaiting a shipping location capture
    if (session && session.stage === 'awaiting_shipping_location') {
      const location = text.trim();
      session.shippingLocation = location;
      session.stage = 'menu_shown';
      sessions.set(message.from, session);
      await message.reply(`Perfecto. He anotado el lugar de envío: ${location}. Te confirmamos precio y disponibilidad en unos minutos.`);
      return;
    }

    // Enforce name-first flow: if user hasn't provided a name, ask for it before any menu/product processing
    if (!session || session.stage !== 'menu_shown') {
      await message.reply('👋 ¡Hola! Soy el asistente virtual de AGRO MONTES. ¿Cómo te llamas?');
      sessions.set(message.from, { stage: 'awaiting_name' });
      return;
    }

    // If user asks about shipping (envío), handle it and ask for location
    if (containsShipping(text)) {
      // If we have the address already, confirm; else ask
      if (session && session.shippingLocation) {
        await message.reply(`Sí, hacemos envíos a ${session.shippingLocation}. Te confirmaremos precio y tiempos.`);
      } else {
        // ask for shipping location and set stage
        sessions.set(message.from, { stage: 'awaiting_shipping_location', name: session && session.name });
        await message.reply('¿A qué lugar deseas que realicemos el envío? Indica ciudad / distrito / país.');
      }
      return;
    }

    // --- 1. MENÚ PRINCIPAL ---
    // If user types 'hola' without the !hola legacy command and session isn't initialized, ask for name
    if (msg.includes('hola') && (!session || session.stage !== 'menu_shown')) {
      // Ask for name and set awaiting_name
      await message.reply('👋 ¡Hola! Soy el asistente virtual de AGRO MONTES. ¿Cómo te llamas?');
      sessions.set(message.from, { stage: 'awaiting_name' });
      return;
    }

    // If user says 'hola' again and we already showed the menu, re-show the menu to orient them
    if (msg.includes('hola') && session && session.stage === 'menu_shown') {
      await message.reply(buildWelcomeMenu(session.name));
      return;
    }

    if (msg.includes('menu') || (session && session.stage === 'menu_shown' && msg === 'menu')) {
      const name = session && session.name ? session.name : '';
      await message.reply(buildWelcomeMenu(name));
      return;
    }

    // --- 2. SUB-MENÚS (LÍNEAS) ---
    // Opción 1: Fitoprotectores
    if (msg === '1' || msg.includes('fito')) {
      await message.reply(
        '🛡️ LÍNEA FITOPROTECTORES\n' +
        'Protección sanitaria del cultivo.\n\n' +
        '🛡️ LÍNEA FITOPROTECTORES Aquí tienes nuestros productos para sanidad:\n\n' +
        '🔹 SULFA MAX 87: Azufre + Nitrógeno.\n' +
        '🔹 DUO MIX OIL: Insecticida natural (Ajo + Ají).\n' +
        '🔹 KANELO OIL: Aceite de Canela (Arañita/Mosca).\n' +
        '🔹 PROTECCION Cu 270: Cobre sistémico (Bactericida).\n' +
        '🔹 OMEGA OIL 369: Aceite de Salmón (Queresas).'
      );
      return;
    }

    // Opción 2: Nutrientes
    if (msg === '2' || msg.includes('nutri')) {
      await message.reply(
        '⚡ LÍNEA NUTRIENTES\n' +
        'Fertilizantes para corregir deficiencias.\n\n' +
        '⚡ LÍNEA NUTRIENTES Fertilizantes foliares de alta asimilación:\n\n' +
        '🔸 BORO B15: Para floración.\n' +
        '🔸 ZINC Zn14: Para crecimiento (Auxinas).\n' +
        '🔸 MAGNESIO Mg11: Para el verdor (Fotosíntesis).\n' +
        '🔸 EQUILIBRA NPK: Fórmula balanceada 20-20-20.\n' +
        '🔸 FOSFORO P45: Energía a la raíz.\n' +
        '🔸 CALCIO Ca35: Dureza de fruto.\n' +
        '🔸 BROTE MAX: Arranque vegetativo (40-10-10).'
      );
      return;
    }

    // Opción 3: Bioestimulantes
    if (msg === '3' || msg.includes('bio')) {
      await message.reply(
        '🌱 LÍNEA BIOESTIMULANTES\n' +
        'Para situaciones de estrés y estimulación.\n\n' +
        '🌱 LÍNEA BIOESTIMULANTES Reactiva tu cultivo:\n\n' +
        '🍃 DUO ALGAS FORTE: Extracto de algas marinas.\n' +
        '🍃 AMINOZ V32: Aminoácidos + Energía.\n' +
        '🍃 AMINOPEZ ++: Proteína de Salmón.\n' +
        '🍃 + RAIZ: Potente enraizador.\n' +
        '🍃 SÚPER FÓLICO: Ácido fólico regenerador.'
      );
      return;
    }

    // Opción 4: Mayor Productividad
    if (msg === '4' || msg.includes('productividad') || msg.includes('mayor productividad')) {
      await message.reply(
        '🚀 *MAYOR PRODUCTIVIDAD*\n' +
        'Productos clave para Cosecha y Calibre:\n\n' +
        '💰 POTASIO K50: Maduración y Peso.\n' +
        '💰 AMARRE 3.5: Cuajado potente.\n' +
        '💰 CYTOKING: Citoquininas (Calibre).\n' +
        '💰 GLOBO GIB: Giberelinas (Tamaño).'
      );
      return;
    }

    // Opción 5: Reguladores y Coadyuvantes
    if (msg === '5' || msg.includes('regulador') || msg.includes('coadyuvante') || msg.includes('adherente')) {
      await message.reply(
        '💧 *REGULADORES Y COADYUVANTES*\n' +
        'Optimiza la aplicación y la absorción:\n\n' +
        '🧪 Regulador de pH: Acidificante.\n' +
        '🧪 Adherente: Pegante agrícola.\n' +
        '🧪 Dispersante: Mojante y dispersante.'
      );
      return;
    }

    // --- 3. DETALLE DE PRODUCTOS (PALABRAS CLAVE) ---
    // ---> FITOPROTECTORES
    if (msg.includes('sulfa') || msg.includes('sulfa max') || msg.includes('sulfa max 87')) {
      await message.reply(
        '🦠 SULFA MAX 87® SC: Azufre 87% + N 11%.\n' +
        'Controla Oídio y Ácaros sin manchar el fruto.\n' +
        'Dosis: 500ml/Cilindro.'
      );
      return;
    }
    if (msg.includes('duo mix') || (msg.includes('ajo') && msg.includes('aji')) || msg.includes('duo mix oil')) {
      await message.reply(
        '🐜 DUO MIX OIL®: Extracto de Ajo + Ají.\n' +
        'Insecticida natural que daña el sistema nervioso de la plaga.\n' +
        'Dosis: 200 - 700ml/Cilindro.'
      );
      return;
    }
    if (msg.includes('kanelo') || msg.includes('kanelo oil')) {
      await message.reply(
        '🕷️ KANELO OIL 2.0®: Aceite de Canela.\n' +
        'Excelente para Arañita Roja y Mosca Blanca.\n' +
        'Acción por contacto. Dosis: 200 - 700ml/Cilindro.'
      );
      return;
    }
    if (msg.includes('proteccion') || msg.includes('cobre') || msg.includes('proteccion cu')) {
      await message.reply(
        '🛡️ PROTECCION Cu 270: Cobre Sistémico.\n' +
        'Controla hongos y bacterias en raíz y tallo. Rápida absorción.\n' +
        'Dosis: 400-500ml/Cilindro.'
      );
      return;
    }
    if (msg.includes('omega') || msg.includes('salmon') || msg.includes('omega oil')) {
      await message.reply(
        '🐟 OMEGA OIL 369: Aceite de Salmón.\n' +
        'Aumenta el control de plagas y aporta ácidos grasos que reducen el estrés.\n' +
        'Dosis: 1.5-2L/Cilindro.'
      );
      return;
    }

    // ---> NUTRIENTES
    if (msg.includes('boro') || msg.includes('boro b15')) {
      await message.reply(
        '🌼 BORO B15: Evita la caída de flores y mejora la polinización.\n' +
        'Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('zinc') || msg.includes('zn14')) {
      await message.reply(
        '🌿 ZINC Zn14: Zinc quelatado 14%.\n' +
        'Activa el crecimiento y corrige deficiencias. Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('magnesio') || msg.includes('mg11')) {
      await message.reply(
        '🍃 MAGNESIO Mg11: Quelatado 11%.\n' +
        'Potencia la fotosíntesis y corrige clorosis. Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('equilibra') || msg.includes('20 20 20')) {
      await message.reply(
        '⚖️ EQUILIBRA NPK 20-20-20: Fórmula balanceada multiuso.\n' +
        'Dosis: 1-2L/Cilindro.'
      );
      return;
    }
    if (msg.includes('fosforo') || msg.includes('p45')) {
      await message.reply(
        '⚡ FOSFORO P45: Alta concentración de fósforo (45%).\n' +
        'Uso: desarrollo radicular y floración. Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('calcio') || msg.includes('ca35')) {
      await message.reply(
        '🧱 CALCIO Ca35: Calcio 35% + aminoácidos.\n' +
        'Mejora la dureza y reduce rajaduras. Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('potasio') || msg.includes('k50')) {
      await message.reply(
        '🍇 POTASIO K50: Potasio 50% + Algas.\n' +
        'Mejora maduración, peso y Brix. Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('brote') || msg.includes('40 10 10')) {
      await message.reply(
        '🌱 BROTE MAX (40-10-10): Alto en nitrógeno para arranque.\n' +
        'Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }

    // ---> BIOESTIMULANTES
    if (msg.includes('algas') || msg.includes('duo')) {
      await message.reply(
        '🌊 DUO ALGAS FORTE: Extracto marino para recuperar plantas estresadas (frío/calor).\n' +
        'Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('amarre')) {
      await message.reply(
        '🔗 AMARRE 3.5: Ca + B + Zn.\n' +
        '"Amarra" la flor para asegurar cuajado. Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('aminoz')) {
      await message.reply(
        '🧬 AMINOZ V32: Aminoácidos 32% + N.\n' +
        'Anti-estrés y aporte de energía rápida. Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('aminopez')) {
      await message.reply(
        '🐟 AMINOPEZ ++PLUS: Proteína de Salmón hidrolizada.\n' +
        'Rápida construcción de tejidos. Dosis: 300-500ml foliar.'
      );
      return;
    }
    if (msg.includes('raiz') || msg.includes('enraiz')) {
      await message.reply(
        'root + RAIZ: Bioestimulante radicular de alto poder.\n' +
        'Dosis: 500ml-1L/Cilindro.'
      );
      return;
    }
    if (msg.includes('globo') || msg.includes('gib')) {
      await message.reply(
        '📏 GLOBO GIB: Giberelinas 40%.\n' +
        'Alargamiento celular y rompimiento de dormancia. Dosis: 30-125ml/200L.'
      );
      return;
    }
    if (msg.includes('folico')) {
      await message.reply(
        '🧬 SÚPER FÓLICO 5.7: Ácido Fólico + Algas + Aminoácidos.\n' +
        'División celular y regeneración. Dosis: 250-500ml/200L.'
      );
      return;
    }
    // Reguladores y coadyuvantes - product details
    if (msg.includes('regulador') || msg.includes('ph') || msg.includes('ph ')) {
      await message.reply(
        '💧 *REGULADOR DE pH*\n' +
        'Acidifica el agua para mejorar la eficacia de los agroquímicos.\n' +
        '💧 Dosis referencial: 100 ml / Cilindro (ajustar según análisis de agua).'
      );
      return;
    }
    if (msg.includes('adherente')) {
      await message.reply(
        '💧 *ADHERENTE*\n' +
        'Mejora la adherencia de gotas y reduce lavado por lluvia.\n' +
        '💧 Dosis referencial: 50 - 100 ml / Cilindro.'
      );
      return;
    }
    if (msg.includes('dispersante') || msg.includes('mojante') || msg.includes('dispersa')) {
      await message.reply(
        '💧 *DISPERSANTE / MOJANTE*\n' +
        'Mejora la repartición del producto y reduce gotas.\n' +
        '💧 Dosis referencial: 100 - 200 ml / Cilindro.'
      );
      return;
    }
    if (msg.includes('cyto') || msg.includes('king')) {
      await message.reply(
        '👑 CYTOKING POWER: Citoquininas para mejorar calibre y brotamiento.\n' +
        'Dosis: 250-500ml/Cilindro.'
      );
      return;
    }

    // --- 4. CONTACTO ---
    if (msg === '6' || msg.includes('asesor') || msg.includes('celular') || msg.includes('asesoría')) {
      await message.reply(
        '👨‍🌾 *Asesoría Técnica AGRO MONTES*\n\n' +
        '📞 Celular: 952 348 485\n' +
        '🌐 agromontes-mvp: https://outworlddebourer.github.io/agromontes-mvp/\n' +
        '📍 Atendemos en todos los valles agrícolas del Perú.'
      );
      return;
    }

    // RESPUESTA SI NO ENTIENDE Y FALLBACK A KB/REGLAS
    const reply = botLogic.evaluateMessage(text, { whatsappLink: WHATSAPP_LINK });
    await message.reply(reply);
  } catch (err) {
    console.error('Error procesando mensaje:', err);
    try {
      // avoid revealing internals to users
      await message.reply('Lo siento, ha ocurrido un error al procesar tu mensaje. Intenta de nuevo más tarde.');
    } catch (e) {
      // ignore errors replying
    }
  }
});

// If launched in demo mode, skip WhatsApp client init and just run examples
if (require.main === module && process.argv.includes('--demo')) {
  const examples = [
    'Hola, tengo mucha arañita roja en mi palto y se le caen las hojas.',
    'Necesito que la fruta pese más y madure mejor.',
    'Cuánto cuesta Potasio K50?',
    'Tengo un virus en mis plantas, se estan muriendo'
  ];
  console.log('\n--- Ejemplos de evaluación en local (no WhatsApp) ---');
  for (const ex of examples) {
    console.log('\nCliente:', ex);
    console.log('Bot:', botLogic.evaluateMessage(ex, { whatsappLink: WHATSAPP_LINK }));
  }
} else {
  client.initialize();

}
