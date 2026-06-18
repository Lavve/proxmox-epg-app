# AI Agent Instructions - Proxmox EPG App

Du är en expert på TypeScript, Node.js, React, Material UI (MUI) och Proxmox LXC-miljöer. Din uppgift är att hjälpa till att bygga den här applikationen enligt de strikta arkitektur- och designval som beskrivs nedan.

## 🚀 Projektöversikt
Målet är att skapa en applikation i en Proxmox LXC-container som laddar ner, parsar och visar EPG-data (TV-tablå) från open-epg.com. Appen ska paketeras så att den i framtiden kan installeras via ett Proxmox VE Helper-Script.

## 🏗️ Arkitektur (Monorepo)
Projektet är uppdelat i tre delar i samma repository:
- `/backend`: Node.js + TypeScript + SQLite (`better-sqlite3`). API och EPG-parser.
- `/frontend`: React + TypeScript + Vite + Material UI (MUI) + TanStack Virtual.
- `/proxmox`: Bash-skript (`install.sh`) och Nginx-konfigurationer för LXC.

---

## 💻 Tekniska Regler & Riktlinjer

### 1. Frontend (React & UI)
- **Teknikstack:** React (Vite), TypeScript, TanStack Virtual (för stora tidslinjer/tablåer).
- **UI-ramverk:** Material UI (MUI).
- **Strikta förbud:** **ANVÄND INTE TAILWIND CSS.** Ingen Tailwind-kod eller Tailwind-klasser får genereras.
- **Designstil:** TV-tablåer kräver mycket data på skärmen. Justera MUI-komponenternas densitet (`size="small"`, tajt padding i temat) för att undvika för mycket "luft".

### 2. Backend & API (Node.js)
- **Teknikstack:** Node.js, TypeScript, Express (eller Fastify), `fast-xml-parser`.
- **Databas:** SQLite via biblioteket `better-sqlite3`.
- **Prestandakrav (Viktigt):** Vid parsning av XML till SQLite *måste* alla inserts ske i en samlad SQLite-transaktion (Bulk Insert) för att undvika disk-I/O-flaskhalsar.
- **Tidszoner:** Spara all EPG-tid i databasen som Unix Timestamps (UTC). Låt frontenden hantera konvertering till lokal tid.

### 3. Modularitet & Kommunikation
- Frontend och backend måste vara helt frikopplade.
- Kommunikation sker via ett REST API.
- Aktivera CORS i backenden under utveckling så att lokal frontend (`localhost`) kan anropa backenden som körs på en annan IP/port.

---

## 🛠️ Databasschema (SQLite)
När databasen initieras ska följande struktur och index användas:
- `channels` (id, name, icon, is_enabled, is_favorite)
- `programs` (id, channel_id, title, description, start_time [INT], end_time [INT], category)
- Index på `programs(start_time, end_time)` och `programs(channel_id)`.
