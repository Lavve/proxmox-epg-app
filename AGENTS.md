# AI Agent Instructions - Proxmox EPG App

You are an expert in TypeScript, Node.js, React, Material UI (MUI), and Proxmox LXC environments. Your task is to help build this application according to the strict architectural and design choices outlined below.

## 🚀 Project Overview
The goal is to create a Proxmox LXC container application that downloads, parses, and displays EPG (TV guide) data from open-epg.com. The application must be packaged so it can be installed via a Proxmox VE Helper-Script in the future.

**CRITICAL:** All code, comments, variable names, database schemas, UI text, and logs MUST be written in English for Open Source compatibility.

## 🏗️ Architecture (Monorepo)
The project is split into three parts within a single repository:
- `/backend`: Node.js + TypeScript + SQLite (`better-sqlite3`). API and EPG parser.
- `/frontend`: React + TypeScript + Vite + Material UI (MUI) + TanStack Virtual.
- `/proxmox`: Bash scripts (`install.sh`) and Nginx configurations for the LXC.

---

## 💻 Technical Rules & Guidelines

### 1. Frontend (React & UI)
- **Tech Stack:** React (Vite), TypeScript, TanStack Virtual (for large timeline/grid rendering).
- **UI Framework:** Material UI (MUI).
- **Strict Prohibition:** **DO NOT USE TAILWIND CSS.** No Tailwind code or classes should ever be generated.
- **Design Style:** TV guides require high data density. Adjust MUI component density (`size="small"`, tight padding/margins in the theme) to maximize screen real estate and minimize excessive whitespace.

### 2. Backend & API (Node.js)
- **Tech Stack:** Node.js, TypeScript, Express (or Fastify), `fast-xml-parser`.
- **Database:** SQLite via the `better-sqlite3` library.
- **Performance Requirement:** When parsing XML to SQLite, all inserts *must* run inside a database transaction (Bulk Insert) to prevent disk I/O bottlenecks.
- **Timezones:** Store all EPG times in the database as Unix Timestamps (UTC). Let the frontend handle conversion to the user's local browser time.

### 3. Modularity & Communication
- Frontend and backend must remain completely decoupled.
- Communication happens over a REST API.
- Enable CORS in the backend during development so the local frontend (`localhost`) can call the backend running on a different IP/port.


---

## 🛠️ Database Schema (SQLite)
When initializing the database, use the following structure and indexes:
- `channels` (id, name, icon, is_enabled, is_favorite)
- `programs` (id, channel_id, title, description, start_time [INT], end_time [INT], category)
- Indexes on `programs(start_time, end_time)` and `programs(channel_id)`.
