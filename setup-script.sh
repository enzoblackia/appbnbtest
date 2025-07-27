#!/bin/bash

echo "🚀 Setup Ozzee AI Agent per Mac M1/M2"
echo "======================================"

# Pulisci installazione precedente
echo "🧹 Pulizia file precedenti..."
rm -rf node_modules
rm -f package-lock.json

# Installa dipendenze
echo "📦 Installazione dipendenze..."
npm install --platform=darwin --arch=arm64

# Verifica installazione
if [ $? -eq 0 ]; then
    echo "✅ Installazione completata con successo!"
    echo ""
    echo "🎯 Prossimi passi:"
    echo "1. Assicurati di avere il file index.html dall'artifact precedente"
    echo "2. Avvia l'app con: npm start"
    echo "3. Configura la tua API Key OpenAI nelle impostazioni ⚙️"
else
    echo "❌ Errore durante l'installazione"
    echo "Prova con: npm install --force"
fi