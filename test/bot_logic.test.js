const botLogic = require('../lib/bot_logic');

beforeAll(() => {
  // load KB from repo
  botLogic.loadKB();
});

test('price rule returns price disclaimer', () => {
  const msg = 'Cuánto cuesta Potasio?';
  const r = botLogic.evaluateMessage(msg, { whatsappLink: 'https://wa.me/test' });
  expect(r).toMatch(/te respondemos en unos minutos/i);
});

test('serious disease rule suggests consultation', () => {
  const msg = 'Mis plantas tienen un virus muy raro';
  const r = botLogic.evaluateMessage(msg);
  expect(r).toMatch(/consultar a un ingeniero/i);
});

test('exact product name returns recommendation', () => {
  const msg = 'Me interesa Potasio K50';
  const r = botLogic.evaluateMessage(msg);
  expect(r).toMatch(/Recomendación para Potasio K50|Potasio K50/i);
});

test('keyword match returns product suggestions', () => {
  const msg = 'Tengo problemas con la caída de hojas';
  const r = botLogic.evaluateMessage(msg);
  expect(r).toMatch(/productos/i);
});

test('fuzzy match returns similar product', () => {
  const msg = 'Necesito potasiok50 para mi cultivo';
  const r = botLogic.evaluateMessage(msg);
  expect(r).toMatch(/Recomendación/i);
});

test('normalizeText removes accents and punctuation', () => {
  const raw = 'Árbol: ¡Hola!';
  const n = botLogic.normalizeText(raw);
  expect(n).toBe('arbol hola');
});

test('fuzzyProductMatch identifies named product', () => {
  const fuzzy = botLogic.fuzzyProductMatch('potasio k-50');
  expect(fuzzy).toBeDefined();
  expect(fuzzy.name.toLowerCase()).toMatch(/potasio k50|potasio k-50/i);
});
