# Telegram Clone

Telethon kutubxonasi yordamida ishlaydigan to'liq Telegram web client.

## Xususiyatlar

- Telefon raqam orqali autentifikatsiya
- SMS/Telegram kod tasdiqlash
- 2FA (ikki bosqichli autentifikatsiya) qo'llab-quvvatlash
- Barcha chatlarni ko'rish (shaxsiy, guruhlar, kanallar)
- Real-time xabarlar (WebSocket)
- Xabar yuborish, tahrirlash, o'chirish
- Media yuborish (rasm, video, fayl)
- Typing indicator
- Xabarlarni o'qilgan deb belgilash

## Talablar

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (ixtiyoriy)

## O'rnatish

### 1. Telegram API credentials olish

1. https://my.telegram.org ga kiring
2. "API development tools" bo'limiga o'ting
3. Yangi application yarating
4. `api_id` va `api_hash` ni saqlang

### 2. Environment o'rnatish

```bash
# .env faylni yaratish
cp .env.example .env

# .env faylni tahrirlash va credentials qo'shish
# TELEGRAM_API_ID=your_api_id
# TELEGRAM_API_HASH=your_api_hash
```

### 3. Docker bilan ishga tushirish (tavsiya etiladi)

```bash
# Build va run
docker-compose up --build

# Background'da ishga tushirish
docker-compose up -d --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs

### 4. Manual ishga tushirish

#### Backend

```bash
cd backend

# Virtual environment yaratish
python -m venv venv
source venv/bin/activate  # Linux/Mac
# yoki
.\venv\Scripts\activate  # Windows

# Dependencies o'rnatish
pip install -r requirements.txt

# Ishga tushirish
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Dependencies o'rnatish
npm install

# Development server
npm run dev
```

## Loyiha tuzilmasi

```
telegram-clone/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── telegram_client.py   # Telethon wrapper
│   │   ├── websocket.py         # WebSocket handlers
│   │   ├── routes/
│   │   │   ├── auth.py          # Authentication
│   │   │   ├── chats.py         # Chat operations
│   │   │   ├── messages.py      # Message operations
│   │   │   └── media.py         # File upload/download
│   │   └── models/
│   │       └── schemas.py       # Pydantic models
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API services
│   │   ├── store/               # Zustand store
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## API Endpoints

### Authentication
- `POST /api/auth/send-code` - Telefon raqamga kod yuborish
- `POST /api/auth/sign-in` - Kod bilan kirish
- `POST /api/auth/sign-in-2fa` - 2FA parol bilan kirish
- `POST /api/auth/restore-session` - Sessionni tiklash
- `POST /api/auth/logout` - Chiqish
- `GET /api/auth/me` - Joriy foydalanuvchi

### Chats
- `GET /api/chats/dialogs` - Barcha chatlar
- `GET /api/chats/dialog/{chat_id}` - Bitta chat
- `GET /api/chats/avatar/{entity_id}` - Avatar
- `POST /api/chats/mark-read/{chat_id}` - O'qilgan deb belgilash
- `POST /api/chats/typing/{chat_id}` - Typing indicator

### Messages
- `GET /api/messages/{chat_id}` - Xabarlar
- `POST /api/messages/send` - Xabar yuborish
- `PUT /api/messages/edit` - Xabarni tahrirlash
- `DELETE /api/messages/delete` - Xabarlarni o'chirish
- `POST /api/messages/forward` - Xabarlarni forward qilish

### Media
- `POST /api/media/upload` - Fayl yuklash
- `GET /api/media/download/{chat_id}/{message_id}` - Fayl yuklab olish
- `GET /api/media/preview/{chat_id}/{message_id}` - Preview olish

## WebSocket Events

### Server -> Client
- `new_message` - Yangi xabar
- `message_edited` - Xabar tahrirlandi
- `message_deleted` - Xabar o'chirildi
- `user_update` - Foydalanuvchi holati o'zgardi

### Client -> Server
- `send_message` - Xabar yuborish
- `edit_message` - Xabar tahrirlash
- `delete_message` - Xabar o'chirish
- `mark_read` - O'qilgan deb belgilash
- `start_typing` - Typing indicator

## Xavfsizlik

1. API credentials'ni `.env` faylda saqlang
2. Session string'lar xavfsiz saqlanadi
3. Production'da HTTPS ishlatish majburiy
4. CORS sozlamalarini to'g'rilang

## Litsenziya

MIT
#