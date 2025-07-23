#!/bin/bash

# Quick VPS Setup Script for Pazar+ (AlmaLinux Edition)
# This script automates the initial setup process for AlmaLinux/RHEL-based systems

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons."
        print_error "Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Function to check AlmaLinux version
check_os() {
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot determine OS version"
        exit 1
    fi
    
    . /etc/os-release
    if [[ "$ID" != "almalinux" && "$ID" != "rhel" && "$ID" != "centos" && "$ID" != "rocky" ]]; then
        print_warning "This script is designed for AlmaLinux/RHEL-based systems. Detected: $ID"
        print_warning "Continuing anyway, but some commands might fail..."
    fi
    
    print_status "Detected OS: $PRETTY_NAME"
}

# Function to update system and install EPEL
setup_repositories() {
    print_header "Setting up Repositories"
    
    # Update system
    sudo dnf update -y
    
    # Install EPEL repository (Extra Packages for Enterprise Linux)
    sudo dnf install -y epel-release
    
    # Enable CodeReady PowerTools (for development packages)
    sudo dnf config-manager --set-enabled powertools 2>/dev/null || \
    sudo dnf config-manager --set-enabled crb 2>/dev/null || \
    print_warning "Could not enable PowerTools/CRB repository"
    
    print_status "Repositories configured"
}

# Function to install Node.js
install_nodejs() {
    print_header "Installing Node.js 18.x"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//')
        print_status "Node.js is already installed: $NODE_VERSION"
        return
    fi
    
    # Install Node.js from NodeSource repository
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo dnf install -y nodejs
    
    print_status "Node.js installed: $(node -v)"
    print_status "NPM installed: $(npm -v)"
}

# Function to install PostgreSQL
install_postgresql() {
    print_header "Installing PostgreSQL"
    
    if command -v psql &> /dev/null; then
        print_status "PostgreSQL is already installed"
        return
    fi
    
    # Install PostgreSQL
    sudo dnf install -y postgresql postgresql-server postgresql-contrib
    
    # Initialize database (required for AlmaLinux/RHEL)
    sudo postgresql-setup --initdb
    
    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Configure PostgreSQL authentication (allow local connections)
    sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /var/lib/pgsql/data/postgresql.conf
    sudo sed -i "s/ident/md5/g" /var/lib/pgsql/data/pg_hba.conf
    
    # Restart PostgreSQL to apply configuration changes
    sudo systemctl restart postgresql
    
    print_status "PostgreSQL installed and started"
}

# Function to install Nginx
install_nginx() {
    print_header "Installing Nginx"
    
    if command -v nginx &> /dev/null; then
        print_status "Nginx is already installed"
        return
    fi
    
    sudo dnf install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    print_status "Nginx installed and started"
}

# Function to install PM2
install_pm2() {
    print_header "Installing PM2"
    
    if command -v pm2 &> /dev/null; then
        print_status "PM2 is already installed"
        return
    fi
    
    sudo npm install -g pm2
    print_status "PM2 installed globally"
}

# Function to install development tools
install_dev_tools() {
    print_header "Installing Development Tools"
    
    # Install development tools group and other necessary packages
    sudo dnf groupinstall -y "Development Tools"
    sudo dnf install -y curl wget git openssl
    
    print_status "Development tools installed"
}

# Function to setup database
setup_database() {
    print_header "Setting up PostgreSQL Database"
    
    read -p "Enter database password for pazar_user: " -s DB_PASSWORD
    echo
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE pazar_plus_prod;
CREATE USER pazar_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE pazar_plus_prod TO pazar_user;
ALTER DATABASE pazar_plus_prod OWNER TO pazar_user;
\q
EOF
    
    print_status "Database and user created successfully"
    echo "Database: pazar_plus_prod"
    echo "User: pazar_user"
    echo "Password: [hidden]"
}

# Function to setup application
setup_application() {
    print_header "Setting up Pazar+ Application"
    
    # Run the deployment script
    if [[ -f "deploy-vps.sh" ]]; then
        chmod +x deploy-vps.sh
        ./deploy-vps.sh
    else
        print_error "deploy-vps.sh not found. Please run this script from the project root."
        exit 1
    fi
}

# Function to configure environment
configure_environment() {
    print_header "Configuring Environment Variables"
    
    if [[ ! -f ".env.production" ]]; then
        print_error ".env.production not found"
        exit 1
    fi
    
    cp .env.production .env
    
    read -p "Enter your domain name (or IP address): " DOMAIN
    read -p "Enter database password: " -s DB_PASSWORD
    echo
    read -p "Enter JWT secret (leave empty for auto-generation): " JWT_SECRET
    
    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -base64 32)
    fi
    
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Update .env file
    sed -i "s|CLIENT_URL=.*|CLIENT_URL=https://$DOMAIN|g" .env
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN|g" .env
    sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|g" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
    sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|g" .env
    
    print_status "Environment configured for domain: $DOMAIN"
}

# Function to setup Nginx
setup_nginx() {
    print_header "Configuring Nginx"
    
    if [[ ! -f "nginx.conf.template" ]]; then
        print_error "nginx.conf.template not found"
        exit 1
    fi
    
    # Get application path
    APP_PATH=$(pwd)
    
    # Copy and configure Nginx
    sudo cp nginx.conf.template /etc/nginx/sites-available/pazar-plus 2>/dev/null || {
        # AlmaLinux/RHEL doesn't have sites-available by default, create it
        sudo mkdir -p /etc/nginx/sites-available
        sudo mkdir -p /etc/nginx/sites-enabled
        sudo cp nginx.conf.template /etc/nginx/sites-available/pazar-plus
        
        # Add include directive to main nginx.conf if not present
        if ! grep -q "sites-enabled" /etc/nginx/nginx.conf; then
            sudo sed -i '/include \/etc\/nginx\/conf\.d\/\*\.conf;/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        fi
    }
    
    # Update Nginx configuration
    sudo sed -i "s|YOUR_DOMAIN|$DOMAIN|g" /etc/nginx/sites-available/pazar-plus
    sudo sed -i "s|YOUR_VPS_IP|$(curl -s ifconfig.me)|g" /etc/nginx/sites-available/pazar-plus
    sudo sed -i "s|/path/to/pazar+|$APP_PATH|g" /etc/nginx/sites-available/pazar-plus
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/pazar-plus /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # Test and reload Nginx
    sudo nginx -t
    sudo systemctl reload nginx
    
    print_status "Nginx configured and reloaded"
}

# Function to setup firewall (using firewalld instead of ufw)
setup_firewall() {
    print_header "Configuring Firewall"
    
    # AlmaLinux uses firewalld instead of ufw
    sudo systemctl start firewalld
    sudo systemctl enable firewalld
    
    # Configure firewall rules
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-port=3000/tcp  # Node.js app port
    sudo firewall-cmd --reload
    
    print_status "Firewall configured and enabled"
    print_status "Allowed services: SSH, HTTP, HTTPS"
    print_status "Allowed ports: 3000/tcp"
}

# Function to setup SELinux permissions
setup_selinux() {
    print_header "Configuring SELinux"
    
    # Check if SELinux is enabled
    if command -v getenforce &> /dev/null && [[ $(getenforce) != "Disabled" ]]; then
        print_status "SELinux is enabled, configuring permissions..."
        
        # Allow Nginx to connect to Node.js
        sudo setsebool -P httpd_can_network_connect 1
        
        # Allow Nginx to read application files
        sudo chcon -R -t httpd_exec_t "$(pwd)"
        
        print_status "SELinux permissions configured"
    else
        print_status "SELinux is disabled, skipping SELinux configuration"
    fi
}

# Function to start application
start_application() {
    print_header "Starting Pazar+ Application"
    
    # Start with PM2
    npm run pm2:start
    
    # Save PM2 process list
    pm2 save
    pm2 startup | tail -n 1 | sudo bash
    
    print_status "Application started with PM2"
    print_status "PM2 auto-startup configured"
}

# Main execution
main() {
    print_header "Pazar+ VPS Quick Setup (AlmaLinux Edition)"
    
    check_root
    check_os
    
    print_status "Starting automated VPS setup for AlmaLinux..."
    
    # Setup repositories and update system
    setup_repositories
    
    # Install development tools
    install_dev_tools
    
    # Install required software
    install_nodejs
    install_postgresql
    install_nginx
    install_pm2
    
    # Setup database
    setup_database
    
    # Setup application
    setup_application
    
    # Configure environment
    configure_environment
    
    # Setup Nginx
    setup_nginx
    
    # Setup firewall
    setup_firewall
    
    # Setup SELinux
    setup_selinux
    
    # Start application
    start_application
    
    print_header "Setup Complete!"
    echo ""
    echo "🎉 Pazar+ has been successfully deployed on your AlmaLinux VPS!"
    echo ""
    echo "📋 Summary:"
    echo "   • Application URL: https://$DOMAIN"
    echo "   • Database: pazar_plus_prod"
    echo "   • Application logs: pm2 logs pazar-plus"
    echo "   • Nginx logs: /var/log/nginx/"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Configure your domain's DNS to point to this server"
    echo "   2. Setup SSL certificate: sudo dnf install certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMAIN"
    echo "   3. Configure platform API keys in .env file"
    echo "   4. Test the application by visiting your domain"
    echo ""
    echo "ℹ️  Useful commands:"
    echo "   • Check app status: pm2 status"
    echo "   • View logs: pm2 logs pazar-plus"
    echo "   • Restart app: pm2 restart pazar-plus"
    echo "   • Check nginx: sudo systemctl status nginx"
    echo "   • Check firewall: sudo firewall-cmd --list-all"
    echo "   • Check SELinux: getenforce"
}

# Run main function
main "$@"
