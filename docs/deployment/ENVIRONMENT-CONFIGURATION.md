# Environment Configuration Contract

This document defines the production environment contract for CareerForge AI.

```env
# Application Runtime
NODE_ENV=production
PORT=4000
API_PORT=4000
CORS_ORIGIN=http://localhost
NEXT_PUBLIC_API_URL=http://localhost/api/v1

# Primary Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/careerforge?schema=public

# Distributed Caching & Rate Limiting (Redis)
REDIS_URL=redis://redis:6379

# Event-Driven Streaming Backbone (Kafka)
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=careerforge-api

# Authentication & Cryptography
JWT_SECRET=your_production_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_production_refresh_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Microservices & Intelligence
AI_SERVICE_URL=http://ai-service:8000
FAISS_INDEX_PATH=data/faiss_index.bin

# Distributed Rate Limiting Limits
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
```
