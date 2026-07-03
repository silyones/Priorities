# People's Priorities

People's Priorities is a web app for constituency development planning. Citizens submit local needs by voice, text, or photo; AI groups them into ranked themes; MP staff triage those themes and publish completed outcomes to a public showcase.

## Clone & run

```bash
git clone https://github.com/viki22uied/Priorities.git
cd Priorities
npm install
cd backend && pip install -r requirements.txt && cd ..
```

Copy `backend/.env.example` to `backend/.env` and add your API keys. Then:

```bash
npm run dev
```

