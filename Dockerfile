FROM node:18-slim

# 1. Instalar Chrome y sus dependencias (OBLIGATORIO para el bot)
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    cups-libs \
    libxss1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar variables para que Puppeteer use el Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 3. Preparar carpetas
WORKDIR /usr/src/app

# 4. Copiar e instalar archivos del proyecto
COPY package*.json ./
RUN npm install

COPY . .

# 5. Arrancar el bot
CMD [ "node", "wa_bot.js" ]
