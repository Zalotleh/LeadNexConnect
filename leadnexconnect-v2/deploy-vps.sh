#!/bin/bash

echo "🚀 LeadNexConnect v2 - VPS Deployment Script"
echo "============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Setup PostgreSQL database
echo "🗄️  Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE leadnexconnect;"
sudo -u postgres psql -c "CREATE USER leadnex_user WITH PASSWORD '1234567';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE leadnexconnect TO leadnex_user;"
sudo -u postgres psql -d leadnexconnect -c "GRANT ALL ON SCHEMA public TO leadnex_user;"

# Clone and setup application
echo "📥 Setting up application..."
cd /var/www
# git clone YOUR_REPO_URL leadnexconnect
# For now, copy from current directory
cp -r /home/mr-abu-lukas/Desktop/Leads\ Automation\ tool/leadnexconnect-v2-complete/leadnexconnect-v2 /var/www/leadnexconnect

cd /var/www/leadnexconnect

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy and configure environment
echo "⚙️  Configuring environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Please edit /var/www/leadnexconnect/.env with your configuration"
  read -p "Press enter after editing .env file..."
fi

# Run migrations
echo "🗄️  Running database migrations..."
npm run db:migrate
npm run db:seed

# Build application
echo "🔨 Building application..."
npm run build

# Start with PM2
echo "▶️  Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
echo "🔧 Configuring Nginx..."
cat > /etc/nginx/sites-available/leadnex <<EOF
server {
    listen 80;
    server_name YOUR_DOMAIN.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/leadnex /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Setup SSL
echo "🔒 Setting up SSL with Let's Encrypt..."
apt install -y certbot python3-certbot-nginx
echo "⚠️  To enable SSL, run: certbot --nginx -d YOUR_DOMAIN.com"

echo "✅ Deployment complete!"
echo "📊 View status: pm2 status"
echo "📝 View logs: pm2 logs leadnex-api"
echo "🌐 Access app at: http://YOUR_DOMAIN.com"
