#!/usr/bin/env node
/**
 * CareerForge-AI — Lightweight Endpoint Load & Latency Benchmarking Suite
 * Measures latency percentiles (P50, P90, P95, P99), error rates, and throughput
 * without requiring third-party native binaries or heavy dependencies.
 */

import http from 'node:http';
import https from 'node:https';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0 };
  latencies.sort((a, b) => a - b);
  const getP = (p) => {
    const idx = Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length));
    return latencies[idx];
  };
  return {
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
  };
}

async function requestOnce(url, method = 'GET', headers = {}, body = null) {
  const start = performance.now();
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const isHttps = u.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        u,
        {
          method,
          headers,
          timeout: 5000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            const duration = performance.now() - start;
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 400,
              statusCode: res.statusCode,
              duration,
            });
          });
        }
      );

      req.on('error', (err) => {
        resolve({
          ok: false,
          statusCode: null,
          error: err.code || err.message,
          duration: performance.now() - start,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          ok: false,
          statusCode: 408,
          error: 'TIMEOUT',
          duration: performance.now() - start,
        });
      });

      if (body) {
        req.write(body);
      }
      req.end();
    } catch (err) {
      resolve({
        ok: false,
        statusCode: null,
        error: err.message,
        duration: performance.now() - start,
      });
    }
  });
}

async function runBenchmark(name, url, options = { totalRequests: 50, concurrency: 5 }) {
  const { totalRequests, concurrency } = options;
  console.log(`\n============================================================`);
  console.log(`Benchmark: ${name}`);
  console.log(`Target:    ${url}`);
  console.log(`Requests:  ${totalRequests} | Concurrency: ${concurrency}`);
  console.log(`------------------------------------------------------------`);

  const latencies = [];
  let successful = 0;
  let failed = 0;
  let connectionErrors = 0;

  const startTime = performance.now();
  let completed = 0;

  async function worker() {
    while (completed < totalRequests) {
      completed++;
      const res = await requestOnce(url);
      if (res.ok) {
        successful++;
        latencies.push(res.duration);
      } else {
        failed++;
        if (res.error) connectionErrors++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (performance.now() - startTime) / 1000;
  const throughput = totalRequests / (totalTimeSec || 0.001);
  const failureRate = (failed / totalRequests) * 100;
  const percentiles = calculatePercentiles(latencies);

  console.log(`Execution Time:     ${totalTimeSec.toFixed(2)}s`);
  console.log(`Throughput:         ${throughput.toFixed(1)} req/s`);
  console.log(`Total Requests:     ${totalRequests}`);
  console.log(`Successful:         ${successful}`);
  console.log(`Failed:             ${failed} (${failureRate.toFixed(1)}%)`);
  if (connectionErrors > 0) {
    console.log(`Target Reachable:   NO (Service offline or port closed: ${connectionErrors} connection errors)`);
  } else {
    console.log(`Latency P50:        ${percentiles.p50.toFixed(2)} ms`);
    console.log(`Latency P90:        ${percentiles.p90.toFixed(2)} ms`);
    console.log(`Latency P95:        ${percentiles.p95.toFixed(2)} ms`);
    console.log(`Latency P99:        ${percentiles.p99.toFixed(2)} ms`);
  }

  return {
    name,
    target: url,
    totalRequests,
    successful,
    failed,
    failureRate: `${failureRate.toFixed(1)}%`,
    throughput: `${throughput.toFixed(1)} req/s`,
    isTargetOnline: connectionErrors === 0,
    percentiles,
  };
}

async function runSelfTest() {
  console.log(`\n============================================================`);
  console.log(`Running Self-Test with Embedded Diagnostic Server...`);
  console.log(`============================================================`);

  const server = http.createServer((req, res) => {
    // Add small synthetic latency (2-10ms)
    const delay = Math.floor(Math.random() * 8) + 2;
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    }, delay);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const selfUrl = `http://127.0.0.1:${port}/health`;

  try {
    const res = await runBenchmark('Embedded Diagnostic Server (Self-Test)', selfUrl, {
      totalRequests: 100,
      concurrency: 10,
    });
    console.log(`\nSelf-Test Validation: ${res.successful === 100 ? 'PASS (100% requests accounted)' : 'FAIL'}`);
    return res;
  } finally {
    server.close();
  }
}

async function main() {
  const isSelfTest = process.argv.includes('--self-test');

  if (isSelfTest) {
    await runSelfTest();
    return;
  }

  console.log(`CareerForge AI — Load & Concurrency Benchmark Runner`);
  console.log(`Testing targets against local/staging configurations...`);

  const results = [];

  // 1. API Health / Liveness
  results.push(await runBenchmark('API Live Probe', `${API_BASE}/live`));

  // 2. API Readiness
  results.push(await runBenchmark('API Ready Probe', `${API_BASE}/ready`));

  // 3. API Public Jobs
  results.push(await runBenchmark('API Public Jobs Endpoint', `${API_BASE}/api/v1/jobs`));

  // 4. AI Service Live Probe
  results.push(await runBenchmark('AI Service Live Probe', `${AI_BASE}/live`));

  // 5. AI Service Ready Probe
  results.push(await runBenchmark('AI Service Ready Probe', `${AI_BASE}/ready`));

  console.log(`\n============================================================`);
  console.log(`Summary of Load Benchmark Executions`);
  console.log(`============================================================`);
  console.table(
    results.map((r) => ({
      Target: r.name,
      Online: r.isTargetOnline ? 'YES' : 'OFFLINE',
      'Req/s': r.throughput,
      FailRate: r.failureRate,
      'P50 (ms)': r.isTargetOnline ? r.percentiles.p50.toFixed(1) : 'N/A',
      'P95 (ms)': r.isTargetOnline ? r.percentiles.p95.toFixed(1) : 'N/A',
      'P99 (ms)': r.isTargetOnline ? r.percentiles.p99.toFixed(1) : 'N/A',
    }))
  );
}

main().catch((err) => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
