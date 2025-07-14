#!/bin/bash

# GUAC Management Script
# This script helps manage the GUAC infrastructure deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/guac-compose.yaml"
ENV_FILE="$SCRIPT_DIR/guac.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} GUAC Infrastructure Management${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_compose() {
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        print_error "Neither 'docker-compose' nor 'docker compose' is available."
        exit 1
    fi
}

# Function to run docker compose command
run_compose() {
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
    else
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
    fi
}

# Function to start GUAC
start_guac() {
    print_status "Starting GUAC infrastructure..."
    
    # Create blob storage directory if it doesn't exist
    if [ ! -d "$SCRIPT_DIR/blobstore" ]; then
        mkdir -p "$SCRIPT_DIR/blobstore"
        chmod 777 "$SCRIPT_DIR/blobstore"
    fi
    
    run_compose up -d
    
    print_status "GUAC infrastructure started successfully!"
    print_status "GraphQL API: http://localhost:8080"
    print_status "REST API: http://localhost:8081"
    print_status "NATS Management: http://localhost:8222"
    
    echo ""
    print_warning "Note: It may take a few minutes for all services to be ready."
    print_status "Use '$0 status' to check service health."
}

# Function to stop GUAC
stop_guac() {
    print_status "Stopping GUAC infrastructure..."
    run_compose down
    print_status "GUAC infrastructure stopped."
}

# Function to restart GUAC
restart_guac() {
    print_status "Restarting GUAC infrastructure..."
    stop_guac
    sleep 2
    start_guac
}

# Function to show status
show_status() {
    print_status "GUAC Infrastructure Status:"
    echo ""
    run_compose ps
    echo ""
    
    # Check service health
    print_status "Service Health Checks:"
    
    # Check GraphQL endpoint
    if curl -s -f http://localhost:8080/query > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} GraphQL API (port 8080) - Healthy"
    else
        echo -e "${RED}✗${NC} GraphQL API (port 8080) - Not responding"
    fi
    
    # Check REST endpoint
    if curl -s -f http://localhost:8081/healthz > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} REST API (port 8081) - Healthy"
    else
        echo -e "${RED}✗${NC} REST API (port 8081) - Not responding"
    fi
    
    # Check NATS
    if curl -s -f http://localhost:8222/healthz > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} NATS (port 8222) - Healthy"
    else
        echo -e "${RED}✗${NC} NATS (port 8222) - Not responding"
    fi
}

# Function to show logs
show_logs() {
    if [ -n "$1" ]; then
        print_status "Showing logs for service: $1"
        run_compose logs -f "$1"
    else
        print_status "Showing logs for all services (use Ctrl+C to exit):"
        run_compose logs -f
    fi
}

# Function to pull latest images
pull_images() {
    print_status "Pulling latest GUAC images..."
    run_compose pull
    print_status "Images updated successfully."
}

# Function to clean up
cleanup() {
    print_warning "This will remove all GUAC containers, networks, and volumes."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up GUAC infrastructure..."
        run_compose down -v --remove-orphans
        docker system prune -f
        print_status "Cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to test GUAC with a simple query
test_guac() {
    print_status "Testing GUAC GraphQL API..."
    
    if ! curl -s -f http://localhost:8080/query > /dev/null 2>&1; then
        print_error "GUAC GraphQL API is not responding. Is GUAC running?"
        exit 1
    fi
    
    # Test a simple GraphQL query
    QUERY='{"query": "{ packages(pkgSpec: {}) { type } }"}'
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        -d "$QUERY" http://localhost:8080/query)
    
    if echo "$RESPONSE" | grep -q '"data"'; then
        print_status "✓ GUAC is responding correctly!"
        echo "Sample response: $RESPONSE"
    else
        print_error "GUAC API test failed."
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "GUAC Infrastructure Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start GUAC infrastructure"
    echo "  stop        Stop GUAC infrastructure"
    echo "  restart     Restart GUAC infrastructure"
    echo "  status      Show service status and health"
    echo "  logs [svc]  Show logs (optionally for specific service)"
    echo "  pull        Pull latest Docker images"
    echo "  test        Test GUAC API connectivity"
    echo "  cleanup     Remove all containers, networks, and volumes"
    echo "  help        Show this help message"
    echo ""
    echo "Services:"
    echo "  postgres, nats, guac-graphql, guac-rest, guac-ingestor,"
    echo "  guac-collectsub, guac-osv, guac-depsdev, guac-oci"
    echo ""
    echo "Examples:"
    echo "  $0 start                 # Start all services"
    echo "  $0 logs guac-graphql     # Show GraphQL server logs"
    echo "  $0 status                # Check service health"
}

# Main script logic
main() {
    print_header
    
    # Check prerequisites
    check_docker
    check_compose
    
    case "${1:-help}" in
        start)
            start_guac
            ;;
        stop)
            stop_guac
            ;;
        restart)
            restart_guac
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        pull)
            pull_images
            ;;
        test)
            test_guac
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 