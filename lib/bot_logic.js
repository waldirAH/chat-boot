const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

const KB_PATH = path.join(process.cwd(), 'kb.json');

const DEFAULT_WHATSAPP_LINK = process.env.WHATSAPP_LINK || 'https://wa.me/51921450162';

// Business rule triggers
const PRICE_TERMS = ['precio', 'precios', 'cotiz', 'cuánto', 'cuanto', 'valor'];
const SERIOUS_DISEASE_TERMS = ['virus', 'enfermedad grave', 'fuerte infección', 'necrosis', 'muerte masiva', 'muy enfermo'];

let kb = [];
function loadKB(kbPath = KB_PATH) {
  try {
    const raw = fs.readFileSync(kbPath, { encoding: 'utf8' });
    kb = JSON.parse(raw);
  } catch (err) {
    kb = [];
    // Let caller handle the missing KB, but keep graceful behavior
    console.error('bot_logic: no se pudo cargar kb.json:', err.message);
  }
}

function normalizeText(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\sáéíóúüñ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(text, terms) {
  const n = normalizeText(text);
  return terms.some(term => n.includes(normalizeText(term)));
}



function findExactName(text) {
  const n = normalizeText(text);
  for (const entry of kb) {
    if (!entry || !entry.name) continue;
    if (n.includes(normalizeText(entry.name))) {
      return entry;
    }
  }
  return null;
}

function findByKeywords(text) {
  const n = normalizeText(text);
  const matches = [];
  for (const entry of kb) {
    if (!entry) continue;
    if (entry.keywords) {
      for (const kw of entry.keywords) {
        if (n.includes(normalizeText(kw))) {
          matches.push(entry);
          break;
        }
      }
    }
  }
  return matches;
}

function fuzzyProductMatch(text, threshold = 0.45) {
  const n = normalizeText(text);
  if (!kb || kb.length === 0) return null;
  const names = kb.map(e => e.name);

  // Remove common stop words to get content tokens
  const stopWords = ['necesito', 'para', 'mi', 'tengo', 'quiero', 'favor', 'por', 'mas', 'ayuda', 'hola', 'saludos'];
  const tokens = n.split(/\s+/).filter(w => w && w.length >= 2 && !stopWords.includes(w));
  const tokenPairs = [];
  for (let i = 0; i < tokens.length; i++) {
    tokenPairs.push(tokens[i]);
    if (i + 1 < tokens.length) tokenPairs.push(`${tokens[i]} ${tokens[i+1]}`);
  }

  let bestMatch = { rating: 0, index: -1 };
  for (const t of tokenPairs) {
    const candidate = stringSimilarity.findBestMatch(t, names);
    if (!candidate || !candidate.bestMatch) continue;
    if (candidate.bestMatch.rating > bestMatch.rating) {
      bestMatch = { rating: candidate.bestMatch.rating, index: candidate.bestMatchIndex };
    }
  }

  if (bestMatch.index >= 0 && bestMatch.rating >= threshold) {
    return kb[bestMatch.index];
  }
  return null;
}

function evaluateMessage(messageText, options = {}) {
  const whatsappLink = options.whatsappLink || DEFAULT_WHATSAPP_LINK;

  if (!messageText || typeof messageText !== 'string') return '';

  // Price rule
  if (containsAny(messageText, PRICE_TERMS)) {
    return `Te respondemos en unos minutos con la cotización. Si quieres que incluya envío, indícanos el lugar.`;
  }

  // Serious disease rule
  if (containsAny(messageText, SERIOUS_DISEASE_TERMS)) {
    return 'Recomiendo consultar a un ingeniero en campo para un diagnóstico detallado. Mientras tanto, puedo sugerir medidas paliativas, pero es importante la evaluación presencial.';
  }

  // Exact name match
  const exact = findExactName(messageText);
  if (exact) {
    const functions = exact.functions ? exact.functions.join(', ') : 'Funciones no registradas';
    return `Recomendación para ${exact.name}: ${functions}. ¿Te gustaría recibir cotización o instrucciones de uso?`;
  }

  // Fuzzy product match
  const fuzzy = fuzzyProductMatch(messageText, 0.5);
  if (fuzzy) {
    const functions = fuzzy.functions ? fuzzy.functions.join(', ') : 'Funciones no registradas';
    return `Recomendación (similitud): ${fuzzy.name} — ${functions}. ¿Te gustaría recibir cotización o instrucciones de uso?`;
  }

  // Keyword based
  const matches = findByKeywords(messageText);
  if (matches.length > 0) {
    const unique = {};
    for (const m of matches) unique[m.name] = m;
    const descriptions = Object.values(unique).map(m => `${m.name} (${(m.functions||[]).join(', ')})`);
    return `Te puedo recomendar los siguientes productos: ${descriptions.join(', ')}. Si quieres cotizar, te conecto con el vendedor humano.`;
  }

  // Fallback
  return `No te entendí. Para ver las opciones escribe 'menu' o 'hola' o indícame el nombre del producto o síntoma.`;
}

module.exports = {
  loadKB,
  evaluateMessage,
  normalizeText,
  containsAny,
  findByKeywords,
  findExactName,
  fuzzyProductMatch,
  setKb: (data) => { kb = data; },
  getKb: () => kb,
};
