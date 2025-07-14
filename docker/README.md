# GUAC Infrastructure Setup

This directory contains the complete infrastructure setup for integrating Google GUAC (Graph for Understanding Artifact Composition) with BomBot.

## Overview

GUAC aggregates software security metadata into a high-fidelity graph database, providing directed, actionable insights into your software supply chain security.

### Components

- **PostgreSQL**: Persistent database for GUAC data
- **NATS**: Message queue for ingestion workflows
- **GraphQL Server**: Primary API for querying the supply chain graph
- **REST Server**: Simplified query endpoints
- **Ingestor**: Processes and stores supply chain metadata
- **Collector Subscriber**: Coordinates data collection activities
- **OSV Certifier**: Enriches packages with OSV vulnerability data
- **Deps.dev Collector**: Adds dependency information from deps.dev
- **OCI Collector**: Collects container image metadata

## Quick Start

### Prerequisites

- Docker and Docker Compose
- At least 4GB available RAM
- Ports 5432, 8080, 8081, 4222, 8222, 2782 available

### 1. Start GUAC Infrastructure

```bash
./start-guac.sh start
```

### 2. Verify Installation

```bash
./start-guac.sh status
./start-guac.sh test
```

### 3. Access GUAC APIs

- **GraphQL Playground**: http://localhost:8080
- **REST API**: http://localhost:8081
- **NATS Management**: http://localhost:8222

## Management Commands

### Basic Operations

```bash
# Start all services
./start-guac.sh start

# Stop all services
./start-guac.sh stop

# Restart all services
./start-guac.sh restart

# Check service status and health
./start-guac.sh status
```

### Monitoring and Debugging

```bash
# View logs from all services
./start-guac.sh logs

# View logs from specific service
./start-guac.sh logs guac-graphql
./start-guac.sh logs postgres
./start-guac.sh logs guac-ingestor

# Test API connectivity
./start-guac.sh test
```

### Maintenance

```bash
# Update to latest GUAC images
./start-guac.sh pull

# Complete cleanup (removes all data)
./start-guac.sh cleanup
```

## Configuration

### Environment Variables

Edit `guac.env` to customize your setup:

```bash
# Database settings
POSTGRES_DB=guac
POSTGRES_USER=guac
POSTGRES_PASSWORD=guac-password

# API endpoints
GUAC_GQL_ADDR=0.0.0.0:8080
GUAC_REST_ADDR=0.0.0.0:8081

# Collection intervals
OSV_INTERVAL=5m
DEPSDEV_INTERVAL=5m
```

### Security Considerations

For production deployments:

1. **Change default passwords** in `guac.env`
2. **Use environment variables** for sensitive data
3. **Enable TLS** for external access
4. **Configure firewall rules** for exposed ports
5. **Set up monitoring** and log aggregation

## Integration with BomBot

Once GUAC is running, it will be automatically integrated with BomBot through:

1. **Automatic SBOM Ingestion**: All uploaded SBOMs are sent to GUAC
2. **Enhanced AI Functions**: New assistant functions for GUAC queries
3. **Supply Chain Insights**: Additional UI components for graph exploration
4. **Policy Checks**: Automatic validation of supply chain policies

## GraphQL API Examples

### Basic Package Query

```graphql
{
  packages(pkgSpec: {}) {
    type
    namespaces {
      namespace
      names {
        name
        versions {
          version
        }
      }
    }
  }
}
```

### Vulnerability Query

```graphql
{
  vulnerabilities(vulnSpec: {}) {
    type
    vulnerabilityIDs {
      vulnerabilityID
    }
  }
}
```

### Dependencies Query

```graphql
{
  dependencies(dependencySpec: {}) {
    package {
      type
      namespaces {
        namespace
        names {
          name
        }
      }
    }
    dependsOn {
      type
      namespaces {
        namespace
        names {
          name
        }
      }
    }
  }
}
```

## Data Ingestion

### Ingesting SBOMs

BomBot automatically ingests SBOMs into GUAC, but you can also manually ingest data:

```bash
# Install guaccollect CLI (download from GUAC releases)
curl -L -o guaccollect https://github.com/guacsec/guac/releases/download/v0.8.6/guaccollect-darwin-arm64
chmod +x guaccollect

# Ingest files
./guaccollect files --service-poll=false \
  --blob-addr=file://./blobstore?no_tmp_dir=true \
  path/to/sbom/files/
```

### Supported Formats

GUAC supports ingestion of:

- **SBOMs**: SPDX, CycloneDX
- **Vulnerability Data**: OSV, CSAF VEX, OpenVEX
- **Attestations**: in-toto ITE6, SLSA
- **Scorecard Data**: OpenSSF Scorecard results
- **Package Metadata**: From deps.dev

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check Docker is running
docker info

# Check port conflicts
netstat -tulpn | grep -E ':(8080|8081|5432|4222)'

# Check logs for errors
./start-guac.sh logs
```

#### GraphQL API Not Responding

```bash
# Check if postgres is healthy
./start-guac.sh logs postgres

# Check GraphQL server logs
./start-guac.sh logs guac-graphql

# Try restarting services
./start-guac.sh restart
```

#### Data Not Appearing

```bash
# Check ingestor logs
./start-guac.sh logs guac-ingestor

# Check NATS connectivity
./start-guac.sh logs nats

# Verify blob storage permissions
ls -la blobstore/
```

### Performance Tuning

For large datasets:

1. **Increase PostgreSQL memory** in docker-compose.yaml
2. **Adjust collection intervals** in guac.env
3. **Monitor resource usage** with `docker stats`
4. **Scale collectors** by adding more instances

### Backup and Recovery

```bash
# Backup PostgreSQL data
docker exec guac-postgres pg_dump -U guac guac > guac-backup.sql

# Restore from backup
docker exec -i guac-postgres psql -U guac guac < guac-backup.sql
```

## Monitoring

### Health Checks

All services include health checks. Monitor with:

```bash
# Check all service health
./start-guac.sh status

# Monitor with watch
watch -n 5 './start-guac.sh status'
```

### Metrics

GUAC exposes metrics on various endpoints:

- **NATS**: http://localhost:8222/varz
- **GraphQL**: Custom metrics via GraphQL introspection
- **PostgreSQL**: Standard postgres metrics

## Support

For issues specific to:

- **GUAC Core**: [GUAC GitHub Issues](https://github.com/guacsec/guac/issues)
- **BomBot Integration**: Create issues in this repository
- **Docker Setup**: Check Docker documentation

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BomBot Application                       │
├─────────────────────────────────────────────────────────────┤
│  Upload SBOM  →  OSV Analysis  →  GUAC Ingestion           │
│       ↓              ↓               ↓                     │
│  Quick Cards    AI Analysis    Supply Chain Graph          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  GUAC Infrastructure                        │
├─────────────────────────────────────────────────────────────┤
│  GraphQL API (8080)  ←→  PostgreSQL Database               │
│  REST API (8081)     ←→  NATS Message Queue                │
│  Collectors & Certifiers  ←→  Blob Storage                 │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

1. **Verify GUAC is running**: `./start-guac.sh status`
2. **Upload an SBOM to BomBot**: Test the integration
3. **Explore the GraphQL API**: http://localhost:8080
4. **Check supply chain insights**: In BomBot UI
5. **Configure production settings**: Update passwords and security

---

**Note**: This setup provides a complete GUAC infrastructure ready for integration with BomBot. The infrastructure automatically enriches your supply chain data with vulnerability information, dependency relationships, and metadata from multiple sources. 