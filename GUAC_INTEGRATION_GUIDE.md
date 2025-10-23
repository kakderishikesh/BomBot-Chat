# GUAC Integration Guide for BomBot

## Overview

This guide explains how to use the **Google GUAC (Graph for Understanding Artifact Composition)** integration in BomBot. GUAC transforms your supply chain security from a simple "scan and report" model into a **persistent knowledge graph** that enables advanced relationship analysis, policy compliance checks, and cross-artifact insights.

## What GUAC Adds to BomBot

### Before GUAC Integration
- ✅ Upload SBOM → Get vulnerabilities
- ✅ OSV.dev integration for CVE data
- ✅ AI-powered security advice
- **Stateless**: No memory between uploads
- **Limited scope**: Single SBOM analysis only
- **No relationships**: Can't see cross-project dependencies

### After GUAC Integration
- **Persistent Knowledge Graph**: All SBOMs stored permanently
- **Relationship Analysis**: "What depends on this vulnerable package?"
- **Supply Chain Policies**: SLSA levels, signatures, attestations
- **Cross-Project Insights**: Dependencies across your entire organization
- **Blast Radius Analysis**: Impact assessment for vulnerabilities
- **Compliance Tracking**: Track security posture over time

---

## Quick Start

### 1. Start GUAC Infrastructure

```bash
# Navigate to docker directory
cd docker

# Start GUAC services
./start-guac.sh start

# Verify everything is running
./start-guac.sh status
```

### 2. Configure Environment

Copy `env.example` to `.env` and add GUAC settings:

```bash
# GUAC Integration (Supply Chain Graph Analysis)
GUAC_GRAPHQL_URL=http://localhost:8080/query
GUAC_REST_URL=http://localhost:8081
NATS_URL=http://localhost:4222
```

### 3. Upload Your First SBOM

1. Upload any SBOM file as usual
2. **Notice**: The upload response now includes `guacIntegration` status
3. **New**: SBOMs are automatically ingested into GUAC for future analysis

### 4. Explore Supply Chain Insights

1. Ask the AI: *"Show me supply chain insights"*
2. Use new AI functions: *"Analyze blast radius for log4j"*
3. Check policy compliance: *"What's our SLSA compliance status?"*

---

## Features & Capabilities

### 1. Automatic SBOM Ingestion

**What it does**: Every uploaded SBOM is automatically stored in GUAC's graph database.

**How it works**:
- Upload SBOM → BomBot processes normally → **+ Auto-ingests to GUAC**
- Zero additional steps required
- Works with SPDX and CycloneDX formats

**Benefits**:
- Build organizational knowledge over time
- Enable cross-SBOM relationship queries
- Support version drift analysis

### 2. Enhanced AI Assistant Functions

The AI Assistant now has **5 new GUAC-powered functions**:

#### `query_supply_chain_graph`
```
Ask: "What packages are in our supply chain graph?"
Ask: "Show me all vulnerabilities across our projects"
```

#### `analyze_supply_chain_relationships`
```
Ask: "What's the blast radius if log4j has a new CVE?"
Ask: "Which projects depend on this vulnerable library?"
```

#### `check_supply_chain_policy`
```
Ask: "What's our SLSA compliance status?"
Ask: "Which packages lack security attestations?"
```

#### `compare_sbom_versions`
```
Ask: "What changed between our SBOMs this month?"
Ask: "Show me version drift across projects"
```

### 3. Supply Chain Graph Visualization

**New UI Components**:
- **GuacInsightsTab**: Interactive supply chain explorer
- **SupplyChainGraph**: Visual relationship mapper
- **PolicyComplianceViewer**: SLSA & attestation tracker

**Key Features**:
- Interactive node-edge graph visualization
- Zoom, pan, and export capabilities
- Click-to-analyze package relationships
- Real-time policy compliance scores

### 4. Policy Compliance Tracking

**Supported Policies**:
- **SLSA Levels**: 0-3 provenance tracking
- **Code Signatures**: Cryptographic signature verification
- **Security Scorecards**: OpenSSF scorecard integration
- **Vulnerability Management**: CVE response tracking
- **License Compliance**: Legal requirement checking

**Compliance Dashboard**:
- Overall compliance score (0-100%)
- Individual policy check results
- Actionable remediation recommendations
- Historical compliance trends

---

## Using GUAC with the AI Assistant

### Supply Chain Analysis Queries

```
"Analyze the supply chain impact of CVE-2023-12345"
"What packages in our organization use log4j?"
"Show me all unsigned packages in our supply chain"
"Which SBOMs have the highest risk packages?"
"What's our overall supply chain security posture?"
```

### Policy & Compliance Queries

```
"Check SLSA compliance for our Node.js packages"
"Which packages lack security attestations?"
"What's our average security scorecard score?"
"Show packages that violate our security policies"
"Generate a compliance report for the security team"
```

### Relationship & Dependency Queries

```
"What's the blast radius for the axios package?"
"Show me transitive dependencies for React"
"Which projects would be affected by a jQuery CVE?"
"Analyze dependency drift across our SBOMs"
"Find packages with the most downstream dependents"
```

### Version & Change Analysis

```
"Compare this SBOM with last month's version"
"What packages were added since our last scan?"
"Show me version upgrades across our projects"
"Which vulnerabilities were fixed in recent updates?"
"Track security improvements over time"
```

---

## API Reference

### GUAC Query API (`/api/guac-query`)

```typescript
POST /api/guac-query
{
  "queryType": "packages" | "vulnerabilities" | "dependencies" | "relationships",
  "filters": {
    "packageName": "string",
    "packageType": "npm" | "PyPI" | "Maven" | etc,
    "version": "string",
    "vulnerabilityId": "CVE-2023-1234"
  },
  "returnFormat": "graphql" | "simplified"
}
```

### GUAC Relationships API (`/api/guac-relationships`)

```typescript
POST /api/guac-relationships
{
  "queryType": "dependencies" | "dependents" | "vulnerabilities" | "blast_radius",
  "subject": {
    "name": "package-name",
    "version": "1.0.0",
    "type": "package" | "artifact" | "vulnerability"
  },
  "options": {
    "maxDepth": 3,
    "includeTransitive": true
  }
}
```

### GUAC Ingestion API (`/api/guac-ingest`)

```typescript
POST /api/guac-ingest
{
  "sbomContent": "string", // SBOM JSON/XML content
  "fileName": "example.spdx",
  "format": "spdx" | "cyclonedx" | "auto",
  "metadata": {
    "source": "BomBot-Upload",
    "userEmail": "user@example.com"
  }
}
```

---

## UI Components Guide

### GuacInsightsTab

**Location**: New tab in chat interface
**Purpose**: Main supply chain exploration dashboard

**Features**:
- Supply chain metrics overview
- Package search and analysis
- Quick action buttons
- Vulnerability and compliance summaries

**Usage**:
1. Upload an SBOM (auto-enables tab)
2. Click "Supply Chain Graph" tab
3. Explore packages, vulnerabilities, relationships
4. Use search to find specific components

### SupplyChainGraph

**Purpose**: Visual graph of package relationships

**Features**:
- Interactive node-edge visualization
- Zoom, pan, reset controls
- Click nodes for detailed analysis
- Export graph as SVG
- Color-coded by risk level

**Navigation**:
- **Drag**: Pan around the graph
- **Scroll**: Zoom in/out
- **Click node**: Select and analyze
- **Reset button**: Return to center view

### PolicyComplianceViewer

**Purpose**: Security policy and compliance tracking

**Features**:
- Overall compliance score
- SLSA level tracking
- Security scorecard integration
- Policy check results
- Remediation recommendations

**Compliance Metrics**:
- **Excellent (80-100%)**: Strong security posture
- **Good (60-79%)**: Adequate with room for improvement
- **Fair (40-59%)**: Needs attention
- **Poor (0-39%)**: Requires immediate action

---

## Advanced Use Cases

### 1. Vulnerability Impact Analysis

**Scenario**: A new CVE is published for a package you use.

**GUAC-Powered Workflow**:
1. Ask AI: *"What's the blast radius for [package-name]?"*
2. Get list of all affected projects and SBOMs
3. Prioritize remediation based on dependency depth
4. Track fix deployment across organization

**Without GUAC**: Manual search through individual SBOMs

### 2. Supply Chain Policy Enforcement

**Scenario**: Implement organization-wide security policies.

**GUAC-Powered Workflow**:
1. Define policies (SLSA Level 2+, signed packages, etc.)
2. Use AI: *"Check SLSA compliance across our organization"*
3. Get non-compliant package list
4. Generate remediation roadmap
5. Track improvement over time

**Without GUAC**: Manual compliance checking per project

### 3. Multi-Project Security Oversight

**Scenario**: Security team needs org-wide visibility.

**GUAC-Powered Workflow**:
1. All teams upload SBOMs to BomBot
2. Security team uses: *"Show enterprise security dashboard"*
3. Identify systemic issues (version drift, vulnerable packages)
4. Coordinate remediation across teams
5. Generate executive reports

**Without GUAC**: Fragmented view, manual aggregation

### 4. Dependency Version Management

**Scenario**: Track and manage package versions across projects.

**GUAC-Powered Workflow**:
1. Upload SBOMs from multiple projects
2. Ask: *"Show me version drift for our core dependencies"*
3. Identify teams using outdated/vulnerable versions
4. Coordinate upgrade campaigns
5. Monitor adoption progress

**Without GUAC**: No cross-project visibility

---

## Troubleshooting

### GUAC Services Not Starting

**Problem**: `./start-guac.sh start` fails

**Solutions**:
```bash
# Check Docker is running
docker info

# Check port availability
lsof -i :8080 -i :8081 -i :5432 -i :4222

# View detailed logs
./start-guac.sh logs

# Reset and restart
./start-guac.sh stop
./start-guac.sh clean
./start-guac.sh start
```

### SBOM Ingestion Failing

**Problem**: Upload succeeds but `guacIntegration.status: 'failed'`

**Solutions**:
1. **Check GUAC connectivity**:
   ```bash
   curl http://localhost:8080/query -d '{"query":"{ packages { name } }"}'
   ```

2. **Verify environment variables**:
   ```bash
   echo $GUAC_GRAPHQL_URL
   echo $GUAC_REST_URL
   ```

3. **Check GUAC logs**:
   ```bash
   ./start-guac.sh logs guac-graphql
   ```

### AI Assistant Functions Not Working

**Problem**: GUAC functions return errors

**Solutions**:
1. **Verify API endpoints**:
   ```bash
   curl -X POST http://localhost:3000/api/guac-query \
     -H "Content-Type: application/json" \
     -d '{"queryType":"packages"}'
   ```

2. **Check Assistant configuration**:
   - Ensure `ASSISTANT_ID` is set
   - Verify OpenAI API key
   - Check function definitions in upload.ts

3. **Review function call logs**:
   - Check browser console
   - Check Next.js server logs

### Graph Visualization Issues

**Problem**: SupplyChainGraph not rendering

**Solutions**:
1. **Check data format**:
   ```javascript
   // Ensure data structure matches:
   {
     nodes: [{ id, label, type, ... }],
     edges: [{ source, target, relationship }]
   }
   ```

2. **Browser compatibility**:
   - Ensure SVG support
   - Check for JavaScript errors
   - Try different browser

### Performance Issues

**Problem**: GUAC queries are slow

**Solutions**:
1. **Database optimization**:
   ```bash
   # Restart PostgreSQL
   ./start-guac.sh restart postgres
   ```

2. **Limit query scope**:
   - Use specific package filters
   - Reduce maxDepth in relationship queries
   - Use simplified return format

3. **Monitor resource usage**:
   ```bash
   docker stats
   ```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check all services
./start-guac.sh status

# Test GraphQL endpoint
curl http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{"query":"{ packages { name } }"}'

# Test ingestion pipeline
curl http://localhost:8081/health
```

### Regular Maintenance

**Weekly**:
- Review ingestion logs
- Check disk space usage
- Verify data integrity

**Monthly**:
- Update GUAC version
- Archive old data if needed
- Review performance metrics

**Quarterly**:
- Security policy review
- Compliance reporting
- Infrastructure optimization

### Backup & Recovery

**Database Backup**:
```bash
# Backup PostgreSQL data
docker exec guac-postgres pg_dump -U guac guac > guac_backup.sql

# Restore from backup
docker exec -i guac-postgres psql -U guac guac < guac_backup.sql
```

**Configuration Backup**:
```bash
# Backup Docker configs
cp docker/guac-compose.yaml docker/guac-compose.yaml.backup
cp docker/guac.env docker/guac.env.backup
```

---

## Getting Help

### Community Resources

- **GUAC GitHub**: https://github.com/guacsec/guac
- **GUAC Documentation**: https://docs.guac.sh/
- **SLSA Framework**: https://slsa.dev/
- **OpenSSF Scorecard**: https://securityscorecards.dev/

### BomBot GUAC Support

**For Integration Issues**:
1. Check this guide's troubleshooting section
2. Review logs with `./start-guac.sh logs`
3. Verify environment configuration
4. Test GUAC services independently

**For Feature Requests**:
- Open GitHub issue with detailed requirements
- Include use case and expected behavior
- Provide relevant SBOM examples

**For Bug Reports**:
- Include full error messages
- Provide steps to reproduce
- Share relevant logs and configuration
- Specify browser and environment details

---

## Future Roadmap

### Planned Enhancements

**Q1**: 
- Advanced graph filtering and search
- Custom policy definition UI
- SLSA builder integration

**Q2**:
- Multi-tenant support
- Role-based access control
- Enhanced compliance reporting

**Q3**:
- Supply chain risk scoring
- Automated remediation suggestions
- Integration with CI/CD pipelines

**Q4**:
- Machine learning risk prediction
- Advanced threat intelligence
- Enterprise dashboard

### Integration Opportunities

- **CI/CD Pipeline Integration**: Automatic SBOM generation and ingestion
- **Security Tools**: Connect with Snyk, WhiteSource, etc.
- **Package Managers**: Direct integration with npm, pip, maven
- **Cloud Platforms**: AWS, Azure, GCP supply chain services

---

**Happy Supply Chain Securing!**

*For questions or support, refer to the troubleshooting section or check the community resources above.* 