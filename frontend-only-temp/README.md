# Simulador del Vendedor Digital - Agro Montes

Este pequeño proyecto contiene un simulador sencillo que reproduce la lógica del "vendedor digital":

- `chat boot.md` - Documento con la estructura conceptual (identidad, base de conocimiento, reglas de negocio).
- `kb.json` - Base de conocimiento ejemplo con productos, funciones y palabras clave.
- `bot_simulator.py` - Script Python que simula:
  - identidad (System Prompt)
  - matching por nombre o por intención (palabras clave)
  - reglas de negocio (no inventar precios, derivar enfermedades graves)

Requisitos: Python 3.8+ (si el comando `python` apunta a Python 3.x en tu sistema).
Si quieres ejecutar pruebas de Python, instala pytest con:

```powershell
pip install -r requirements.txt
pytest -q
```

Ejecución (PowerShell):

```powershell
python bot_simulator.py
```

El script muestra ejemplos y sus respuestas, y tiene un modo interactivo comentado al final para probar mensajes manualmente.

Si deseas, puedo añadir un `requirements.txt` (no requiere por ahora) o ampliar la lógica de matching con un pequeño algoritmo de similitud.

## Integración con WhatsApp (Node.js)

También incluimos un ejemplo de integración con WhatsApp usando `whatsapp-web.js` y `qrcode-terminal`.

Requisitos adicionales:
- Node.js 14+ (recomendado 16+)

Instalación de dependencias (PowerShell):

```powershell
npm install
```

Ejecución del bot de WhatsApp (escanea el QR la primera vez):

```powershell
npm start
```

Ejecutar pruebas unitarias (Jest):

```powershell
npm install
npm test
```

También se añadió un módulo `lib/bot_logic.js` que centraliza la lógica del bot (normalización, matching y reglas de negocio). Esto hace más fácil añadir nuevos interfaces (HTTP, CLI o WhatsApp) y escribir tests sobre la lógica.

CLI y demo:

```powershell
npm run demo    # Ejecuta ejemplos y no inicia Whatsapp
npm run eval "TENGO ARAÑITA ROJA EN MI PALTO"  # Evaluar un mensaje desde el CLI
```
API HTTP (opcional):

Si deseas exponer la evaluación vía HTTP para pruebas o integración, ejecuta el servidor:

```powershell
npm run start:server
```

Ejemplo (curl):

```powershell
curl -X POST -H "Content-Type: application/json" -d "{ \"text\": \"Me entra arañita roja en los palta\" }" http://localhost:3000/evaluate
```


Ambiente: puedes definir `WHATSAPP_LINK` como variable de entorno para que las respuestas usen tu número en enlaces de contacto:

```powershell
setx WHATSAPP_LINK "https://wa.me/569XXXXXXXX"
``` 

Notas importantes:
- El archivo `wa_bot.js` usa `LocalAuth` para almacenar sesión y evitar escanear QR cada vez; `./.wwebjs_auth/` se guarda en tu proyecto.
- Cambia `WHATSAPP_LINK` en `wa_bot.js` por el número real del vendedor (ej. `https://wa.me/569XXXXXXXX`).
- Cambia `WHATSAPP_LINK` en `wa_bot.js` por el número real del vendedor (ej. `https://wa.me/569XXXXXXXX`).
- Si la máquina no tiene navegador/pupperteer configurados, instala Chrome o Chromium compatible y prueba en modo `headless: false` para depuración.
- Asegúrate de no subir la carpeta `.wwebjs_auth` a un repositorio público.

La implementación del bot atiende mensajes simples y usa la `kb.json` para las recomendaciones; aplica reglas de negocio como "no inventar precios" o "derivar enfermedad grave a ingeniero".

Flujos implementados recientes:
- Respuesta a consultas de precio: ahora el bot responde "Te respondemos en unos minutos" y ofrece la opción de incluir envío en la cotización.
- Flujo de envío: si el usuario pregunta por envío, el bot pedirá la ubicación (ciudad/distrito/país), la guardará temporalmente en la sesión y confirmará que verificará disponibilidad y precio.
- Mensaje de Asesoría: actualizado para mostrar el link acortado `agromontes-mvp` y la URL completa.

Si quieres que implemente una API HTTP (express) que exponga la evaluación del bot via endpoint `POST /evaluate`, dímelo y lo agrego.
