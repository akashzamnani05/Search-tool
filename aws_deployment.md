# AWS Deployment Guide — Document Search System

**Stack**: Python Flask Backend + Meilisearch + Next.js Frontend + External MSSQL
**Target Audience**: Beginners
**Estimated Time**: 2–3 hours

---

## Architecture Overview (What We're Building)

```
Internet
   │
   ▼
┌─────────────────────────────────────────────────┐
│          AWS Amplify (Frontend)                  │
│          Next.js app — search UI                 │
└─────────────────────┬───────────────────────────┘
                      │ HTTP calls to /api
                      ▼
┌─────────────────────────────────────────────────┐
│          EC2 Ubuntu Server                       │
│                                                  │
│  Nginx (port 80) ──► Flask Backend (port 5001)   │
│                  └──► Meilisearch (port 7700)    │
└─────────────────────────────────────────────────┘
                      │
                      ▼ SQL queries
┌─────────────────────────────────────────────────┐
│   External MSSQL Server (103.182.153.94:1433)    │
│   Already running — no setup needed              │
└─────────────────────────────────────────────────┘
```

- **EC2 Instance** — runs Flask backend + Meilisearch + Nginx
- **AWS Amplify** — hosts the Next.js frontend
- **MSSQL** — already running externally, no changes needed

---

## PART 1 — Create an AWS Account

### Step 1.1 — Sign Up for AWS

1. Go to [https://aws.amazon.com](https://aws.amazon.com)
2. Click **"Create an AWS Account"**
3. Enter your email, set a password, choose account name
4. Enter payment details (you won't be charged immediately — AWS has a free tier)
5. Verify your phone number
6. Choose **"Basic Support"** (free)
7. Wait for account activation email (takes a few minutes)

### Step 1.2 — Log into AWS Console

1. Go to [https://console.aws.amazon.com](https://console.aws.amazon.com)
2. Sign in with root user email and password
3. At the top-right, make sure you're in the region closest to you (e.g., `us-east-1` for US, `ap-south-1` for India)

---

## PART 2 — Launch an EC2 Server (Your Virtual Machine)

This is the server that will run your Flask backend and Meilisearch.

### Step 2.1 — Go to EC2

1. In the AWS Console search bar at the top, type **"EC2"** and click it
2. Click **"Launch Instance"** (orange button)

### Step 2.2 — Configure the Instance

Fill in these settings:

**Name**: `document-search-server` (or any name you like)

**Application and OS Images (AMI)**:
- Click **"Ubuntu"**
- Select **"Ubuntu Server 22.04 LTS"** (look for the one that says "Free tier eligible")
- Architecture: **64-bit (x86)**

**Instance Type**:
- Select **`t3.medium`** (2 vCPU, 4GB RAM)
- Why: Meilisearch needs at least 2GB RAM to run comfortably
- Note: This costs ~$0.04/hour. If budget is tight, try `t3.small` (2GB) but Meilisearch may be slow

**Key Pair (Login)**:
- Click **"Create new key pair"**
- Key pair name: `document-search-key`
- Key pair type: **RSA**
- Private key file format: **.pem** (for Mac/Linux) or **.ppk** (for Windows PuTTY)
- Click **"Create key pair"** — this will **download a file** to your computer
- IMPORTANT: Save this `.pem` file somewhere safe — you can never download it again!

**Network Settings**:
- Click **"Edit"** next to Network Settings
- VPC: leave default
- Subnet: leave default
- Auto-assign public IP: **Enable**
- Firewall (Security Groups): Click **"Create security group"**
- Security group name: `document-search-sg`
- Add these inbound rules:

| Type | Protocol | Port | Source | Why |
|------|----------|------|--------|-----|
| SSH | TCP | 22 | My IP | So only you can SSH in |
| HTTP | TCP | 80 | Anywhere (0.0.0.0/0) | Web traffic via Nginx |
| Custom TCP | TCP | 5001 | Anywhere (0.0.0.0/0) | Flask backend (for testing) |

Note: Port 7700 (Meilisearch) is NOT opened to the internet — it stays private, only Flask talks to it directly.

**Storage**:
- Change from 8 GB to **20 GB** (Meilisearch index can grow large)
- Volume type: gp3

### Step 2.3 — Launch the Instance

1. Review the summary on the right
2. Click **"Launch Instance"** (orange button)
3. Click **"View all Instances"**
4. Wait 2–3 minutes until the **Instance State** shows **"Running"** and **Status Check** shows **"2/2 checks passed"**

### Step 2.4 — Note Down Your Server's IP Address

1. Click on your instance name in the list
2. Copy the **"Public IPv4 address"** (looks like `54.12.34.56`)
3. Save this IP — you'll use it many times

---

## PART 3 — SSH Into Your Server (Connect via Terminal)

### Step 3.1 — On Mac/Linux

Open your Terminal and run:

```bash
# First, fix permissions on the key file (required by SSH)
chmod 400 /path/to/document-search-key.pem

# Connect to the server (replace with your actual IP)
ssh -i /path/to/document-search-key.pem ubuntu@YOUR_EC2_IP
```

Example:
```bash
chmod 400 ~/Downloads/document-search-key.pem
ssh -i ~/Downloads/document-search-key.pem ubuntu@54.12.34.56
```

When prompted "Are you sure you want to continue connecting?" — type `yes` and press Enter.

### Step 3.2 — On Windows

1. Download **PuTTY** from https://putty.org
2. Open **PuTTYgen**, load your `.pem` file, click "Save private key" to create a `.ppk` file
3. Open **PuTTY**
4. Host Name: `ubuntu@YOUR_EC2_IP`
5. Go to Connection > SSH > Auth > Credentials — browse to your `.ppk` file
6. Click **Open**

You should now see a terminal prompt like: `ubuntu@ip-172-31-xx-xx:~$`

---

## PART 4 — Set Up the Server

Run these commands one by one in the terminal.

### Step 4.1 — Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

This updates all system packages. Takes 1–2 minutes.

### Step 4.2 — Install Python 3.11

```bash
# Install Python 3.11 and development tools
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Verify installation
python3.11 --version
```

You should see: `Python 3.11.x`

### Step 4.3 — Install Microsoft ODBC Driver for SQL Server

Your backend connects to MSSQL. This driver is required:

```bash
# Add Microsoft's package repository
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list

# Update and install the ODBC driver
sudo apt update
sudo ACCEPT_EULA=Y apt install -y msodbcsql17 unixodbc-dev

# Verify
odbcinst -q -d -n "ODBC Driver 17 for SQL Server"
```

### Step 4.4 — Install Additional System Libraries

```bash
# Required for pymssql and document processing
sudo apt install -y gcc g++ git nginx curl unzip build-essential libffi-dev libssl-dev
```

### Step 4.5 — Install Meilisearch Binary

```bash
# Go to home directory
cd ~

# Download Meilisearch for Linux
curl -L https://github.com/meilisearch/meilisearch/releases/latest/download/meilisearch-linux-amd64 -o meilisearch

# Make it executable
chmod +x meilisearch

# Test it works
./meilisearch --version
```

You should see something like: `meilisearch 1.x.x`

---

## PART 5 — Upload Your Backend Code

### Step 5.1 — Option A: Using Git (Recommended)

If your project is on GitHub, clone it:

```bash
# On the EC2 server
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git document-search-system
cd document-search-system
```

### Step 5.1 — Option B: Using SCP (Upload from your Mac/PC)

If not on GitHub, upload from your local computer:

```bash
# Run this on YOUR LOCAL TERMINAL (not on EC2)
scp -i ~/Downloads/document-search-key.pem -r /Users/akashzamnani/Documents/Projects/document-search-system/backend ubuntu@YOUR_EC2_IP:~/
```

This uploads the backend folder to your EC2 server.

---

## PART 6 — Set Up the Python Backend

### Step 6.1 — Create a Virtual Environment

```bash
# On EC2, go to the backend directory
cd ~/document-search-system/backend
# OR if you used SCP:
# cd ~/backend

# Create a virtual environment
python3.11 -m venv venv

# Activate it
source venv/bin/activate

# Your prompt will now show (venv) at the start
```

### Step 6.2 — Install Python Dependencies

```bash
# Make sure venv is active (you see "(venv)" in prompt)
pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt
```

This may take 3–5 minutes. You'll see lots of text — that's normal.

If you see errors about `pymssql`, try:
```bash
sudo apt install -y freetds-dev freetds-bin
pip install pymssql
```

### Step 6.3 — Create the Environment File

```bash
# Create the .env file with your settings
nano .env
```

This opens a text editor. Paste the following (replace values where shown):

```
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=MySecretMasterKey2024
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
SECRET_KEY=replace-this-with-any-long-random-string-abcdef123456
FRONTEND_URL=http://YOUR_EC2_IP

MAX_SEARCH_RESULTS=10
SEARCH_TIMEOUT=5000
BATCH_SIZE=10
MAX_CONTENT_LENGTH=50000

DATABASE_TABLES=FORMS_MASTER,VESSEL_CERTIFICATES,SurveyCertificates
```

Important notes:
- `MEILISEARCH_API_KEY` — choose any password you want (use the same key in both backend .env and when starting Meilisearch)
- `SECRET_KEY` — type any random long string
- `FRONTEND_URL` — your EC2 public IP for now (update to domain later if you get one)

To save in nano: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 6.4 — Test Backend Manually

Start Meilisearch first in background, then test Flask:

```bash
# Start Meilisearch temporarily (replace key with what you put in .env)
~/meilisearch --master-key="MySecretMasterKey2024" &

# Wait 3 seconds for it to start
sleep 3

# Test backend (make sure venv is still active)
cd ~/document-search-system/backend
source venv/bin/activate
python run.py --skip-checks &

# Wait 3 seconds
sleep 3

# Test the health endpoint
curl http://localhost:5001/api/health
```

You should see JSON like `{"status": "healthy", ...}`

Stop the temporary processes:
```bash
# Find and kill them
pkill meilisearch
pkill -f "python run.py"
```

---

## PART 7 — Set Up Meilisearch as a System Service

Instead of running Meilisearch manually every time, make it run automatically on server start.

### Step 7.1 — Create Data Directory

```bash
mkdir -p ~/meilisearch-data
```

### Step 7.2 — Create Meilisearch Service File

```bash
sudo nano /etc/systemd/system/meilisearch.service
```

Paste this content (replace `MySecretMasterKey2024` with your actual key):

```ini
[Unit]
Description=Meilisearch Search Engine
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/meilisearch --http-addr 127.0.0.1:7700 --master-key="MySecretMasterKey2024" --db-path /home/ubuntu/meilisearch-data
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save with `Ctrl+X`, `Y`, `Enter`

### Step 7.3 — Start Meilisearch Service

```bash
# Reload systemd to pick up the new file
sudo systemctl daemon-reload

# Enable it to start on boot
sudo systemctl enable meilisearch

# Start it now
sudo systemctl start meilisearch

# Check it's running
sudo systemctl status meilisearch
```

You should see `Active: active (running)` in green.

---

## PART 8 — Set Up Flask Backend as a System Service

### Step 8.1 — Install Gunicorn

Gunicorn is a production-grade Python web server (better than Flask's built-in server):

```bash
cd ~/document-search-system/backend
source venv/bin/activate
pip install gunicorn
```

### Step 8.2 — Create Flask Service File

```bash
sudo nano /etc/systemd/system/flask-backend.service
```

Paste this (adjust paths if your folder structure differs):

```ini
[Unit]
Description=Flask Backend - Document Search
After=network.target meilisearch.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/document-search-system/backend
Environment="PATH=/home/ubuntu/document-search-system/backend/venv/bin"
EnvironmentFile=/home/ubuntu/document-search-system/backend/.env
ExecStart=/home/ubuntu/document-search-system/backend/venv/bin/gunicorn --workers 2 --bind 127.0.0.1:5001 --timeout 120 "app:create_app()"
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save with `Ctrl+X`, `Y`, `Enter`

### Step 8.3 — Check How Flask App is Created

Before starting the service, verify the app factory function name:

```bash
cat ~/document-search-system/backend/app/__init__.py | head -20
```

If your `__init__.py` has `def create_app():` — use `"app:create_app()"` in the service file.
If it directly creates an `app` variable — use `"run:app"` instead.

### Step 8.4 — Start Flask Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable flask-backend
sudo systemctl start flask-backend
sudo systemctl status flask-backend
```

You should see `Active: active (running)`

If it fails, check logs:
```bash
sudo journalctl -u flask-backend -n 50
```

---

## PART 9 — Set Up Nginx (Web Proxy)

Nginx sits in front of your Flask app. It handles incoming web traffic and forwards it to Flask.

### Step 9.1 — Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/document-search
```

Paste this content:

```nginx
server {
    listen 80;
    server_name YOUR_EC2_IP;  # Replace with your EC2 IP or domain

    # Backend API — forward to Flask
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        client_max_body_size 50M;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5001/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Replace `YOUR_EC2_IP` with your actual EC2 public IP.

Save with `Ctrl+X`, `Y`, `Enter`

### Step 9.2 — Enable the Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/document-search /etc/nginx/sites-enabled/

# Remove the default site (optional but clean)
sudo rm /etc/nginx/sites-enabled/default

# Test the nginx config (should say "syntax is ok" and "test is successful")
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 9.3 — Test the Backend via Nginx

```bash
curl http://YOUR_EC2_IP/api/health
```

You should get a JSON health response. If yes — your backend is live!

---

## PART 10 — Index Your Documents

Now tell Meilisearch to fetch documents from your MSSQL database and build the search index.

### Step 10.1 — Trigger Indexing via API

```bash
curl -X POST http://YOUR_EC2_IP/api/index \
  -H "Content-Type: application/json" \
  -d '{"clear_existing": false}'
```

This will:
1. Connect to your MSSQL database
2. Fetch all documents from `FORMS_MASTER`, `VESSEL_CERTIFICATES`, `SurveyCertificates`
3. Extract text from each document (PDF, DOCX, etc.)
4. Index them in Meilisearch

This can take **10–30 minutes** depending on how many documents you have.

### Step 10.2 — Check Indexing Status

```bash
curl http://YOUR_EC2_IP/api/stats
```

This shows how many documents are indexed.

---

## PART 11 — Deploy the Frontend on AWS Amplify

AWS Amplify is the easiest way to deploy a Next.js app on AWS. It's like Vercel but on AWS.

### Step 11.1 — Push Your Code to GitHub (If Not Already)

On your local computer:

```bash
cd /Users/akashzamnani/Documents/Projects/document-search-system

# Initialize git if not already done
git init

# Add all files (excluding those in .gitignore)
git add .
git commit -m "Prepare for AWS deployment"

# Create a new repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/document-search-system.git
git push -u origin main
```

### Step 11.2 — Update Frontend API URL

Before pushing, update the frontend config to point to your EC2 server.

On your local computer, open [frontend/next.config.js](frontend/next.config.js) and update the API URL:

```javascript
env: {
  NEXT_PUBLIC_API_URL: 'http://YOUR_EC2_IP/api'  // ← change this
},
```

Commit and push this change:
```bash
git add frontend/next.config.js
git commit -m "Update API URL to EC2 server"
git push
```

### Step 11.3 — Open AWS Amplify

1. In the AWS Console search bar, type **"Amplify"** and click it
2. Click **"Create new app"**
3. Choose **"Host web app"**

### Step 11.4 — Connect to GitHub

1. Select **"GitHub"** as your source
2. Click **"Authorize AWS Amplify"** — this opens GitHub login
3. Allow Amplify to access your repositories
4. In the dropdown, select your repository: `document-search-system`
5. Branch: `main`
6. Click **"Next"**

### Step 11.5 — Configure Build Settings

Amplify will auto-detect it's a Next.js app. But we need to set the correct app root.

Click **"Edit"** on the build settings and replace with:

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

Click **"Next"**

### Step 11.6 — Add Environment Variable

1. Before finalizing, scroll to **"Advanced settings"**
2. Click **"Add environment variable"**
3. Add:
   - Variable: `NEXT_PUBLIC_API_URL`
   - Value: `http://YOUR_EC2_IP/api`
4. Click **"Next"**

### Step 11.7 — Deploy

1. Review all settings
2. Click **"Save and Deploy"**
3. Amplify will now:
   - Pull your code from GitHub
   - Install npm packages
   - Build the Next.js app
   - Deploy it to a CDN URL

Wait 5–10 minutes. You'll see a progress bar for each step.

### Step 11.8 — Get Your Frontend URL

When deployment is complete, Amplify gives you a URL like:
`https://main.d1234abcde.amplifyapp.com`

Click on it — your search UI should be live!

---

## PART 12 — Update Backend CORS for Frontend URL

Now that you have the Amplify URL, update the backend to allow requests from it.

### Step 12.1 — Update .env on EC2

SSH into your EC2 and update:

```bash
nano ~/document-search-system/backend/.env
```

Update this line:
```
FRONTEND_URL=https://main.d1234abcde.amplifyapp.com
```

### Step 12.2 — Restart Flask

```bash
sudo systemctl restart flask-backend
```

---

## PART 13 — Final Testing

Test each part end-to-end:

```bash
# 1. Test Meilisearch is running
sudo systemctl status meilisearch

# 2. Test Flask backend health
curl http://YOUR_EC2_IP/api/health

# 3. Test MSSQL connection
curl http://YOUR_EC2_IP/api/test-connection

# 4. Test search works
curl -X POST http://YOUR_EC2_IP/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 5}'

# 5. Check indexing stats
curl http://YOUR_EC2_IP/api/stats
```

Open your Amplify URL in a browser and try searching. You should see results!

---

## PART 14 — Useful Maintenance Commands

Save these for later:

```bash
# View Flask backend logs
sudo journalctl -u flask-backend -f

# View Meilisearch logs
sudo journalctl -u meilisearch -f

# Restart Flask backend
sudo systemctl restart flask-backend

# Restart Meilisearch
sudo systemctl restart meilisearch

# Check server disk usage
df -h

# Check RAM usage
free -m

# Check CPU usage
top

# Re-index documents (run when MSSQL data changes)
curl -X POST http://YOUR_EC2_IP/api/index -H "Content-Type: application/json" -d '{"clear_existing": true}'

# Clear the search index
curl -X POST http://YOUR_EC2_IP/api/index/clear
```

---

## Troubleshooting

### Flask service won't start

```bash
sudo journalctl -u flask-backend -n 100
```

Common fixes:
- Check `.env` file has correct values and no typos
- Make sure `venv` path in service file is correct
- Verify `gunicorn` is installed in the venv

### MSSQL connection fails

```bash
curl http://YOUR_EC2_IP/api/test-connection
```

Check:
- EC2's security group allows outbound traffic on port 1433 (it does by default)
- The MSSQL server at `103.182.153.94` allows connections from EC2's IP
- ODBC Driver 17 is installed correctly

### Meilisearch won't start

```bash
sudo journalctl -u meilisearch -n 50
```

Check:
- Enough disk space: `df -h`
- Enough RAM: `free -m`
- Port 7700 not already in use: `sudo lsof -i :7700`

### Frontend shows "Cannot connect to API"

- Check the `NEXT_PUBLIC_API_URL` environment variable in Amplify console
- Verify EC2 security group has port 80 open
- Test backend directly: `curl http://YOUR_EC2_IP/api/health`
- Check CORS — restart Flask after updating `FRONTEND_URL` in `.env`

### Amplify build fails

- Check build logs in Amplify console
- Make sure your `frontend/` directory is committed to GitHub
- Verify `package.json` exists in `frontend/`

---

## Cost Estimate

| Service | Type | Estimated Monthly Cost |
|---------|------|----------------------|
| EC2 t3.medium | Compute | ~$30/month |
| EC2 Storage (20GB) | EBS gp3 | ~$1.60/month |
| AWS Amplify | Frontend hosting | Free tier: 1000 build mins/month, then ~$0.01/min |
| Data Transfer | Outbound | ~$0.09/GB after 1GB free |
| **Total Estimate** | | **~$32–35/month** |

To reduce costs: Stop (not terminate) the EC2 instance when not in use. You can do this from the EC2 console — you only pay for storage when stopped.

---

## Summary — What You've Built

```
https://main.d1234abcde.amplifyapp.com  ← Your frontend (Next.js on Amplify)
         │
         │ POST /api/search
         ▼
http://YOUR_EC2_IP/api  ← Nginx proxy (port 80)
         │
         ▼
Flask on 127.0.0.1:5001  ← Python backend
         │                        │
         │ search queries         │ document fetch
         ▼                        ▼
Meilisearch:7700        MSSQL: 103.182.153.94:1433
(indexed docs)          (source documents)
```

Your document search system is now live on AWS!
