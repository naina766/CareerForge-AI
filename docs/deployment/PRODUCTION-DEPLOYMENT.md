# CareerForge AI — Production Deployment Guide

## 1. System Requirements & Architecture
- **Hardware**: Minimum 4 vCPUs, 8 GB RAM, 50 GB SSD
- **Operating Environment**: Linux (Ubuntu 22.04 LTS / Debian 12 / Docker Desktop)
- **Containerization**: Docker 24.0+ & Docker Compose v2.20+
- **Database**: PostgreSQL 15+
- **Cache & Rate Limiting**: Redis 7+
- **Event Streaming**: Apache Kafka 3.5+ & Zookeeper 3.8+
- **Vector Intelligence**: FAISS dense similarity layer (Python 3.11)

---

## 2. Production Deployment Steps

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/naina766/CareerForge-AI.git
cd CareerForge-AI

# Configure production environment variables
cp .env.example .env
```

### Step 2: Validate Docker Compose Configuration
```bash
docker compose -f docker-compose.prod.yml config
```

### Step 3: Launch Production Cluster
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4: Run Database Migrations
```bash
docker compose -f docker-compose.prod.yml exec api pnpm exec prisma db push
```

### Step 5: Verify Cluster Health
```bash
curl -f http://localhost/health
curl -f http://localhost/ready
```

---

## 3. Production Service Topography
| Service | Internal Port | Public Exposure | Description |
| :--- | :--- | :--- | :--- |
| **Nginx** | 80, 443 | Public | Reverse proxy, SSL termination, rate limiter |
| **Next.js Web** | 3000 | Internal Only | Server-rendered React application |
| **Express API** | 4000 | Internal Only | Core REST API & transactional business logic |
| **FastAPI AI** | 8000 | Internal Only | Semantic embeddings & FAISS vector search |
| **Resume Worker** | - | Internal Only | Kafka consumer: resume PDF processing |
| **AI Worker** | - | Internal Only | Kafka consumer: AI match & gap computation |
| **Notification Worker** | - | Internal Only | Kafka consumer: real-time in-app alerts |
| **PostgreSQL** | 5432 | Internal Only | Source-of-truth relational database |
| **Redis** | 6379 | Internal Only | Distributed rate limit & caching |
| **Kafka Broker** | 9092 | Internal Only | Event streaming backbone |
