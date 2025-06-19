# Production Load Testing Guide for 30-User Survey

This guide provides step-by-step instructions for testing BomBot with 30 concurrent users for 7 minutes on your production environment.

## 🎯 Survey Test Overview

- **Duration**: 7 minutes total
- **Users**: 30 concurrent participants  
- **Ramp-up**: 1 minute (gradual user arrival)
- **Peak Load**: 5 minutes at full capacity
- **Ramp-down**: 1 minute (users completing tasks)

## 🚀 Quick Start

### Option 1: Direct Script Execution
```bash
# Test production site
./tests/load/run-load-tests.sh survey https://bombot.vercel.app

# Test staging environment  
./tests/load/run-load-tests.sh survey https://bombot-staging.vercel.app
```

### Option 2: NPM Command
```bash
# Set target URL and run
export TARGET_URL="https://bombot.vercel.app"
npm run load-test:survey
```

## 📋 Pre-Test Checklist

1. **Verify Production State**
   ```bash
   curl -I https://bombot.vercel.app
   # Should return 200 OK
   ```

2. **Check Dependencies**
   ```bash
   # Artillery should be installed
   npm install -g artillery
   
   # Verify test files exist
   ls tests/load/survey-simulation.yml
   ls tests/load/test-data/sample-sbom.json
   ```

3. **Monitor Resources** (Optional)
   - Open Vercel dashboard
   - Have OpenAI usage dashboard ready
   - Monitor Supabase dashboard if using custom logging

## 🎮 Test Scenarios

The survey simulation includes three realistic user journeys:

### Scenario 1: SBOM Upload (40% of users)
- User uploads an SBOM file
- Waits for AI analysis
- Asks follow-up questions about vulnerabilities

### Scenario 2: Package Query (35% of users)  
- User queries specific packages
- Searches for CVE information
- Asks AI for vulnerability assessment

### Scenario 3: Quick Exploration (25% of users)
- Brief interface exploration
- Quick package checks
- Simulates casual browsing

## 📊 Expected Results

### Success Criteria
- **Response Time**: <5 seconds (p95) for API calls
- **Error Rate**: <2% across all requests
- **Throughput**: Handle 30 concurrent users smoothly
- **Uptime**: 100% during test period

### Key Metrics to Monitor
```
http_req_duration..........: avg=2.1s  min=180ms max=8.2s  p(95)=4.8s
http_req_failed............: 1.2%
http_reqs..................: 1850 total, 4.4/s average
vus........................: 30 concurrent users
vus_max....................: 30 peak users
```

## ⚡ Running the Test

### Step 1: Execute Test
```bash
cd /path/to/BomBot-Chat
./tests/load/run-load-tests.sh survey https://bombot.vercel.app
```

### Step 2: Monitor Progress
The script will show real-time progress:
```
🚀 Starting BomBot Load Testing
Target URL: https://bombot.vercel.app
Test Type: survey

🔍 Checking prerequisites...
✅ Artillery found
✅ Target URL is reachable

🔥 Warming up server...
✅ Warmup complete

🎯 Running Survey_Simulation test...
```

### Step 3: Review Results
Results are saved with timestamp:
```
tests/load/results/
├── Survey_Simulation_20240115_143022.json
├── Survey_Simulation_20240115_143022.html
└── summary_20240115_143022.md
```

## 🔍 Analyzing Results

### Open HTML Report
```bash
# Open in browser
open tests/load/results/Survey_Simulation_*.html
```

### Key Areas to Check

1. **Response Time Distribution**
   - Look for p95 and p99 percentiles
   - Identify any spikes or outliers

2. **Error Analysis**
   - Check 4xx and 5xx error rates
   - Identify which endpoints fail most

3. **Throughput Analysis**
   - Requests per second throughout test
   - User arrival and completion rates

4. **Resource Usage**
   - Vercel function execution times
   - OpenAI API response times
   - Database query performance

## 🚨 Troubleshooting

### High Error Rates (>5%)
```bash
# Check if rate limits are hit
grep "429" tests/load/results/Survey_Simulation_*.json

# Verify OpenAI API limits
# Check Vercel function logs
```

### Slow Response Times (>10s)
- Check Vercel cold start issues
- Verify database connection pooling
- Monitor OpenAI API latency

### Test Fails to Start
```bash
# Verify connectivity
curl -I https://bombot.vercel.app

# Check prerequisites
artillery --version
node --version
```

## 💡 Production Best Practices

### Before Testing
1. **Notify stakeholders** about the load test
2. **Backup critical data** if needed
3. **Monitor during business hours** for quick response
4. **Have rollback plan** ready

### During Testing
1. **Watch error rates** in real-time
2. **Monitor resource usage** on dashboards  
3. **Be ready to stop** if issues arise
4. **Document any anomalies** observed

### After Testing
1. **Analyze results thoroughly**
2. **Compare with baseline metrics**
3. **Document performance bottlenecks**
4. **Plan optimization based on findings**

## 📈 Scaling Recommendations

Based on 30-user test results:

- **100 users**: Multiply arrival rate by 3.3x
- **500 users**: Consider staged testing approach
- **1000+ users**: Requires infrastructure assessment

## 🔧 Customizing the Test

### Modify User Count
Edit `tests/load/survey-simulation.yml`:
```yaml
phases:
  - duration: 60
    arrivalRate: 0.8  # Adjust for different user counts
    rampTo: 7.2       # 50 users instead of 30
```

### Change Duration
```yaml
phases:
  - duration: 120     # 2 minute ramp-up
    arrivalRate: 0.5
  - duration: 600     # 10 minutes sustained
    arrivalRate: 4.5
```

### Test Different Scenarios
Modify scenario weights in the YAML:
```yaml
scenarios:
  - name: "SBOM Upload"
    weight: 60        # 60% SBOM uploads
  - name: "Package Query"  
    weight: 30        # 30% package queries
  - name: "Quick Exploration"
    weight: 10        # 10% exploration
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review test logs in `tests/load/results/`
3. Verify all prerequisites are met
4. Ensure production environment is stable

---

**Ready to test?** Run: `./tests/load/run-load-tests.sh survey https://bombot.vercel.app` 