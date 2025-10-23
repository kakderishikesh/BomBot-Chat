# BOMbot Load Testing Guide

## Overview

This guide covers comprehensive load testing for BOMbot, a Next.js application deployed on Vercel with OpenAI integration, Supabase database, and OSV API dependencies.

## Setup Instructions

### Step 1: Install Dependencies

```bash
# Install load testing tools globally
npm install -g artillery autocannon

# Install project dependencies (if not done already)
npm install
```

### Step 2: Verify Test Data

Ensure the following test data files exist:
- `tests/load/test-data/sample-emails.csv` - Email addresses for user simulation
- `tests/load/test-data/test-packages.csv` - Package names for OSV queries
- `tests/load/test-data/sample-sbom.json` - Sample SBOM file for upload tests

### Step 3: Environment Setup

```bash
# For local testing
export TARGET_URL="http://localhost:3000"

# For production testing (replace with your Vercel URL)
export TARGET_URL="https://your-bombot-app.vercel.app"
```

## Test Types Available

### 1. Light Load Test
**Purpose**: Basic functionality testing with minimal load
- **Duration**: 2 minutes
- **Concurrent Users**: 2 new users/second
- **Best for**: Smoke testing, basic validation

```bash
# Using npm script
npm run load-test:light

# Using shell script
./tests/load/run-load-tests.sh light https://your-app.vercel.app
```

### 2. Moderate Load Test
**Purpose**: Realistic user simulation
- **Duration**: 7 minutes (1min ramp-up + 5min sustained + 1min ramp-down)
- **Concurrent Users**: Up to 10 new users/second
- **Best for**: Performance baseline, regression testing

```bash
npm run load-test:moderate
```

### 3. Heavy Load Test
**Purpose**: Stress testing to find breaking points
- **Duration**: 14 minutes (2min ramp-up + 10min sustained + 2min ramp-down)
- **Concurrent Users**: Up to 25 new users/second
- **Best for**: Capacity planning, bottleneck identification

```bash
npm run load-test:heavy
```

### 4. Upload Load Test
**Purpose**: File upload performance testing
- **Duration**: 3 minutes
- **Concurrent Users**: 1 upload/second (CPU intensive)
- **Best for**: SBOM processing performance

```bash
npm run load-test:upload
```

### 5. Stress Test (Autocannon)
**Purpose**: Quick burst testing
- **Duration**: 30 seconds
- **Concurrent Users**: 20 concurrent connections
- **Best for**: Quick performance checks

```bash
npm run stress-test TARGET_URL
```

### 6. Complete Test Suite
**Purpose**: Full performance validation
- **Duration**: ~30 minutes
- **Includes**: All test types with cool-down periods

```bash
./tests/load/run-load-tests.sh all https://your-app.vercel.app
```

## Key Metrics to Monitor

### 1. Response Time Metrics
- **Mean Response Time**: Average request duration
- **p95 Response Time**: 95th percentile (most users experience)
- **p99 Response Time**: 99th percentile (worst case scenario)
- **Max Response Time**: Slowest request

**Good Targets:**
- Frontend pages: < 2 seconds (p95)
- API endpoints: < 5 seconds (p95)
- File uploads: < 30 seconds (p95)

### 2. Throughput Metrics
- **Requests/Second**: Total request processing rate
- **Successful Requests**: Non-error responses
- **Failed Requests**: Error responses (4xx, 5xx)

**Good Targets:**
- Error Rate: < 1%
- Success Rate: > 99%

### 3. Concurrent User Capacity
- **Virtual Users**: Simulated concurrent users
- **Active Connections**: Concurrent connections sustained
- **Peak Load**: Maximum load before degradation

## BOMbot-Specific Bottlenecks to Watch

### 1. Vercel Serverless Functions
**Symptoms:**
- High cold start latency (first request to a function)
- Function timeout errors (10-second limit for Hobby plan)
- Memory limit errors

**Monitoring:**
```bash
# Check function execution time
grep "Duration:" vercel-logs.txt

# Check memory usage
grep "Memory Used:" vercel-logs.txt
```

### 2. OpenAI API Rate Limits
**Symptoms:**
- 429 "Too Many Requests" errors
- Chat functionality failures
- Slow AI response times

**Monitoring:**
- Monitor OpenAI dashboard for usage
- Check API response headers for rate limit info
- Track threadId creation rate

### 3. OSV API Dependencies
**Symptoms:**
- Package query failures
- Slow vulnerability scanning
- Rate limiting from OSV.dev

**Monitoring:**
- Track OSV API response times
- Monitor 429 errors from OSV
- Check batch processing delays

### 4. Supabase Database
**Symptoms:**
- Chat logging failures
- Database connection errors
- Slow query performance

**Monitoring:**
- Check Supabase dashboard for connection pools
- Monitor query execution times
- Track database error rates

## Running Your First Load Test

### Step 1: Local Testing (Recommended First)
```bash
# Start your local development server
npm run dev

# In another terminal, run light load test
./tests/load/run-load-tests.sh light http://localhost:3000
```

### Step 2: Production Testing
```bash
# Deploy to Vercel first
npm run deploy

# Run moderate load test on production
./tests/load/run-load-tests.sh moderate https://your-bombot-app.vercel.app
```

### Step 3: Analyze Results
1. Open the generated HTML report in your browser
2. Review the summary markdown file
3. Check for error patterns in logs
4. Compare metrics against targets

## Interpreting Results

### Sample Artillery Report Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Artillery Summary Report                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Errors:                                                                     │
│ • http.codes.500: 15                          # ❌ Server errors            │
│ • http.timeout: 3                            # ❌ Timeouts                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ HTTP responses:                                                              │
│ • 200: 2145                                  # ✅ Successful requests      │
│ • 400: 23                                    # ⚠️ Client errors           │
│ • 500: 15                                    # ❌ Server errors            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Response times:                                                              │
│ • min: 95                                    # ✅ Fast minimum             │
│ • max: 15087                                 # ❌ Very slow maximum        │
│ • mean: 1854                                 # ⚠️ Acceptable average       │
│ • p95: 4223                                  # ❌ Poor 95th percentile     │
│ • p99: 8945                                  # ❌ Very poor 99th percentile│
└─────────────────────────────────────────────────────────────────────────────┘
```

**Analysis:**
- **Good**: High success rate (98.3%)
- **Concerning**: High p95/p99 response times
- **Issues**: Server errors and timeouts need investigation

### Optimization Recommendations

Based on the above analysis:

1. **Investigate 500 errors**: Check Vercel function logs
2. **Optimize slow endpoints**: Profile database queries
3. **Add caching**: Implement response caching for static data
4. **Scale resources**: Consider Vercel Pro for better performance

## Troubleshooting Common Issues

### Issue 1: Tests Failing to Connect
```bash
# Check if URL is reachable
curl -I https://your-bombot-app.vercel.app

# Check DNS resolution
nslookup your-bombot-app.vercel.app
```

### Issue 2: High Error Rates
```bash
# Check Vercel function logs
vercel logs --follow

# Monitor real-time errors
tail -f tests/load/results/latest.json | grep error
```

### Issue 3: OpenAI Rate Limits
```bash
# Check OpenAI API usage
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/usage
```

### Issue 4: Memory Issues
```bash
# Monitor system resources during local testing
top -p $(pgrep node)

# Check Vercel function memory
grep "Memory Used" vercel-logs.txt
```

## Pre-Production Checklist

Before deploying to production:

- [ ] **Light load test passes** with < 1% error rate
- [ ] **Moderate load test passes** with acceptable response times
- [ ] **Upload test completes** without memory issues
- [ ] **Database queries optimized** with proper indexes
- [ ] **API rate limits configured** appropriately
- [ ] **Error handling tested** with invalid inputs
- [ ] **Monitoring setup** for production alerts
- [ ] **Backup strategy verified** for database
- [ ] **Security testing completed** (if applicable)

## Alert Thresholds for Production

Set up monitoring alerts for:

- **Error Rate**: > 2%
- **Response Time p95**: > 10 seconds
- **Database Connections**: > 80% of limit
- **OpenAI API Usage**: > 80% of limit
- **Memory Usage**: > 80% of function limit
- **Disk Usage**: > 90% (if applicable)

## Additional Resources

- [Artillery.io Documentation](https://artillery.io/docs/)
- [Vercel Performance Monitoring](https://vercel.com/docs/concepts/analytics)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [OSV.dev API Documentation](https://osv.dev/docs/)

## Next Steps

1. **Run your first light load test** to establish baseline
2. **Gradually increase load** to find capacity limits
3. **Set up continuous monitoring** for production
4. **Create performance regression tests** for CI/CD
5. **Document optimization strategies** for your team

---

**Happy Load Testing!**

For questions or issues, check the generated summary reports or review Vercel/OpenAI dashboard during tests. 