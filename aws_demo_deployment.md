# AWS Demo Deployment — Simple & Cheap

**Goal**: Get a working demo link with minimum setup and cost
**Cost**: ~$10/month (or less if you delete after demo)
**Time**: ~1 hour

---

## Why This Is Different from the Full EC2 Guide

| Full EC2 Guide | This Guide |
|----------------|------------|
| EC2 (complex setup) | **Lightsail** (AWS's simple VPS) |
| Download key file, fix permissions | **SSH directly in browser** |
| Configure security groups manually | **Click checkboxes** |
| ~$32/month | **~$10/month** |
| 2–3 hours | **~1 hour** |

**AWS Lightsail** = EC2 but simplified. Same AWS infrastructure, but with a point-and-click UI and flat monthly pricing. Perfect for demos.

---

## Architecture (Same as Before, Simpler Setup)

```
Browser
  │
  ▼
AWS Amplify (Free) ──── Next.js frontend
  │
  │ API calls
  ▼
AWS Lightsail $10/month
  ├── Flask backend (port 5001)
  ├── Meilisearch (port 7700, internal only)
  └── Nginx (port 80, public)
  │
  ▼
External MSSQL (103.182.153.94) — unchanged
```

**Total cost for a short demo**: If you run it for 1 week and delete it → costs ~$2.50

---

## STEP 1 — Create a Lightsail Instance

### 1.1 — Go to Lightsail

1. Log into [https://console.aws.amazon.com](https://console.aws.amazon.com)
2. In the search bar at the top, type **"Lightsail"** and click it
3. Click **"Create instance"**

### 1.2 — Configure the Instance

**Instance location**: Pick the region closest to you or your audience
- India → `ap-south-1 (Mumbai)`
- US → `us-east-1 (N. Virginia)`

**Pick your instance image**:
- Platform: **Linux/Unix**
- Blueprint: **OS Only**
- Select: **Ubuntu 22.04 LTS**

**Choose your instance plan**:
- Select the **$10/month** plan (2 GB RAM, 1 vCPU, 60 GB SSD)
- Do NOT pick $3.5 or $5 — Meilisearch needs at least 2GB RAM

**Instance name**: `document-search-demo` (or anything)

Click **"Create instance"**

Wait ~2 minutes. The status will change from "Pending" to "Running".

---

## STEP 2 — Open Firewall Ports

Lightsail has its own firewall (separate from the instance).

1. Click on your instance name (`document-search-demo`)
2. Click the **"Networking"** tab
3. Scroll down to **"IPv4 Firewall"**
4. You'll see SSH (22) and HTTP (80) already there
5. Click **"Add rule"** and add:

| Application | Protocol | Port |
|-------------|----------|------|
| Custom | TCP | 5001 |

Click **"Save"**

That's it. Port 80 (Nginx) and 5001 (Flask direct) are now open. Port 7700 (Meilisearch) stays closed to the internet — Flask talks to it internally.

---

## STEP 3 — SSH Into Your Server (From the Browser)

No key file needed!

1. Go to your instance page
2. Click the **orange terminal icon** (or click "Connect using SSH")
3. A browser terminal opens — you're in!

You'll see: `ubuntu@ip-172-xx-xx-xx:~$`

All the commands below are run in this browser terminal.

---

## STEP 4 — Install Everything on the Server

Copy and paste these blocks one at a time.

### 4.1 — Update System

```bash
sudo apt update && sudo apt upgrade -y
```

Takes ~2 minutes. Press `Enter` if asked about restarting services.

### 4.2 — Install Python 3.11 + Tools

```bash
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip gcc g++ git nginx curl unzip build-essential
```

### 4.3 — Install ODBC Driver for MSSQL

```bash
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list
sudo apt update
sudo ACCEPT_EULA=Y apt install -y msodbcsql17 unixodbc-dev
```

If it asks `Do you want to continue? [Y/n]` — type `Y` and Enter.

### 4.4 — Install Meilisearch

```bash
curl -L https://github.com/meilisearch/meilisearch/releases/latest/download/meilisearch-linux-amd64 -o ~/meilisearch
chmod +x ~/meilisearch
~/meilisearch --version
```

You should see something like `meilisearch 1.x.x` — means it worked.

---

## STEP 5 — Upload Your Code

### Option A — From GitHub (easiest)

```bash
git clone https://github.com/YOUR_USERNAME/document-search-system.git ~/app
```

### Option B — From Your Computer (if not on GitHub)

Open a **new terminal on your Mac** (not the browser one) and run:

```bash
# Get your Lightsail instance's public IP first (shown on the instance page)
# Download the default key from Lightsail:
# Go to Account → SSH Keys → Download default key → save as lightsail.pem

chmod 400 ~/Downloads/lightsail.pem

scp -i ~/Downloads/lightsail.pem -r /Users/akashzamnani/Documents/Projects/document-search-system/backend ubuntu@YOUR_LIGHTSAIL_IP:~/app/
```

---

## STEP 6 — Set Up the Backend

Back in the **browser terminal**:

```bash
cd ~/app/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

If `pymssql` fails, run this first:
```bash
sudo apt install -y freetds-dev freetds-bin
pip install pymssql
```

---

## STEP 7 — Create the .env File

```bash
nano ~/app/backend/.env
```

Paste this (values are already correct for your project — only change the keys marked below):

```
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=DemoKey2024Secret
MEILISEARCH_INDEX=documents

MSSQL_HOST=103.182.153.94
MSSQL_PORT=1433
MSSQL_USER=dbVesifTest_Naviox23
MSSQL_PASSWORD=VesifyNaviox@#584
MSSQL_DATABASE=dbVesifTest_Naviox
MSSQL_DRIVER=ODBC Driver 17 for SQL Server

STORAGE_TYPE=mssql
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=any-random-string-here-abc123xyz789
FRONTEND_URL=*

MAX_SEARCH_RESULTS=10
SEARCH_TIMEOUT=5000
BATCH_SIZE=10
MAX_CONTENT_LENGTH=50000

DATABASE_TABLES=FORMS_MASTER,VESSEL_CERTIFICATES,SurveyCertificates
```

Save: `Ctrl+X` → `Y` → `Enter`

Note: `MEILISEARCH_API_KEY=DemoKey2024Secret` — you can set this to anything, just use the same value when starting Meilisearch in the next step.

---

## STEP 8 — Run Meilisearch as a Service

```bash
sudo nano /etc/systemd/system/meilisearch.service
```

Paste this exactly:

```ini
[Unit]
Description=Meilisearch
After=network.target

[Service]
User=ubuntu
ExecStart=/home/ubuntu/meilisearch --http-addr 127.0.0.1:7700 --master-key="DemoKey2024Secret" --db-path /home/ubuntu/meilisearch-data
Restart=always
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Make sure `--master-key` matches `MEILISEARCH_API_KEY` in your `.env`.

Save: `Ctrl+X` → `Y` → `Enter`

```bash
mkdir -p ~/meilisearch-data
sudo systemctl daemon-reload
sudo systemctl enable meilisearch
sudo systemctl start meilisearch

# Verify it's running (look for "active (running)" in green)
sudo systemctl status meilisearch
```

---

## STEP 9 — Run Flask as a Service

```bash
sudo nano /etc/systemd/system/flask-backend.service
```

Paste this:

```ini
[Unit]
Description=Flask Backend
After=network.target meilisearch.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/app/backend
Environment="PATH=/home/ubuntu/app/backend/venv/bin"
EnvironmentFile=/home/ubuntu/app/backend/.env
ExecStart=/home/ubuntu/app/backend/venv/bin/gunicorn --workers 2 --bind 127.0.0.1:5001 --timeout 120 "app:create_app()"
Restart=always
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
sudo systemctl daemon-reload
sudo systemctl enable flask-backend
sudo systemctl start flask-backend

# Check it's running
sudo systemctl status flask-backend
```

If it shows an error, check logs:
```bash
sudo journalctl -u flask-backend -n 30
```

---

## STEP 10 — Set Up Nginx

```bash
sudo nano /etc/nginx/sites-available/demo
```

Paste this (replace `YOUR_LIGHTSAIL_IP`):

```nginx
server {
    listen 80;
    server_name YOUR_LIGHTSAIL_IP;

    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/demo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Test it:
```bash
curl http://localhost/api/health
```

You should get `{"status": "healthy", ...}`

---

## STEP 11 — Index Documents

This fetches all docs from your MSSQL and builds the search index. Run it once:

```bash
curl -X POST http://localhost/api/index \
  -H "Content-Type: application/json" \
  -d '{"clear_existing": false}'
```

This runs in the background on the server. Check progress:

```bash
curl http://localhost/api/stats
```

Wait until `numberOfDocuments` stops increasing (can take 10–30 min depending on doc count).

---

## STEP 12 — Deploy Frontend on AWS Amplify (Free)

### 12.1 — Update API URL in Your Code

On your **local computer**, open [frontend/next.config.js](frontend/next.config.js) and change:

```javascript
env: {
  NEXT_PUBLIC_API_URL: 'http://YOUR_LIGHTSAIL_IP/api'
},
```

Commit and push to GitHub.

### 12.2 — Connect Amplify to GitHub

1. In AWS Console, search **"Amplify"** → click it
2. Click **"Create new app"** → **"Host web app"**
3. Choose **GitHub** → Authorize → select your repo → branch: `main`
4. Click **Next**

### 12.3 — Build Settings

Click **"Edit"** on the build config and paste:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm install
    build:
      commands:
        - cd frontend
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### 12.4 — Add Environment Variable

In **Advanced settings**, add:
- Key: `NEXT_PUBLIC_API_URL`
- Value: `http://YOUR_LIGHTSAIL_IP/api`

Click **Save and Deploy**. Wait 5–10 minutes.

Your frontend URL will look like:
`https://main.d1xxxxxxx.amplifyapp.com`

Open it — your demo is live!

---

## Saving Money — Stop the Instance After the Demo

When your demo is done, **stop** (not delete) the Lightsail instance:

1. Go to Lightsail → your instance
2. Click the three dots `...` → **"Stop"**

Stopped instances cost ~20% of running price (~$2/month for storage only).

When you need to demo again → click **"Start"**.

If you're done forever → click **"Delete"** and it costs nothing more.

---

## Quick Reference

| What | Where |
|------|-------|
| Your server IP | Lightsail instance page |
| SSH terminal | Click orange terminal icon in Lightsail |
| Backend logs | `sudo journalctl -u flask-backend -f` |
| Meilisearch logs | `sudo journalctl -u meilisearch -f` |
| Restart backend | `sudo systemctl restart flask-backend` |
| Health check | `curl http://YOUR_IP/api/health` |
| Re-index docs | `curl -X POST http://YOUR_IP/api/index -H "Content-Type: application/json" -d '{"clear_existing":true}'` |
| Frontend URL | Shown in AWS Amplify console |

---

## Cost Summary

| What | Cost |
|------|------|
| Lightsail $10/month plan | $10/month (~$0.014/hour) |
| Amplify frontend | Free (within free tier for demos) |
| 1-week demo and delete | ~$2.50 total |
| Stopped instance (storage only) | ~$2/month |
