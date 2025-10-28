#!/bin/bash

# Complete Database Migration Script for Cloud Server
echo "=========================================="
echo "Starting Complete Database Migration"
echo "=========================================="

# Check if backup file exists
if [ ! -f "hxms_dev_full_backup.sql" ]; then
    echo "❌ Backup file hxms_dev_full_backup.sql not found!"
    echo "Please make sure you have pulled the latest code from Git repository."
    exit 1
fi

# Show file size
file_size=$(stat -c%s "hxms_dev_full_backup.sql")
echo "📁 Backup file size: $file_size bytes"

# Backup existing data
echo "📦 Creating backup of existing data..."
timestamp=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p hxms_dev > "hxms_dev_cloud_backup_$timestamp.sql" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Existing data backed up to: hxms_dev_cloud_backup_$timestamp.sql"
else
    echo "⚠️  Backup failed or database doesn't exist, continuing with migration"
fi

# Drop and recreate database
echo "🗑️  Dropping and recreating database..."
mysql -u root -p << 'SQL_EOF'
DROP DATABASE IF EXISTS hxms_dev;
CREATE DATABASE hxms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL_EOF

if [ $? -eq 0 ]; then
    echo "✅ Database recreated successfully"
else
    echo "❌ Failed to recreate database"
    exit 1
fi

# Import complete backup
echo "📥 Importing complete database backup..."
mysql -u root -p hxms_dev < hxms_dev_full_backup.sql

if [ $? -eq 0 ]; then
    echo "✅ Complete database imported successfully!"
    
    # Verify import
    echo ""
    echo "🔍 Verifying import results..."
    mysql -u root -p -e "
    USE hxms_dev;
    SELECT '=== Tables Created ===' as Info;
    SHOW TABLES;
    SELECT '' as '';
    SELECT '=== Record Counts ===' as Info;
    SELECT 'channels' as table_name, COUNT(*) as record_count FROM channels
    UNION ALL
    SELECT 'clues', COUNT(*) FROM clues
    UNION ALL
    SELECT 'customers', COUNT(*) FROM customers
    UNION ALL
    SELECT 'departments', COUNT(*) FROM departments
    UNION ALL
    SELECT 'employee_store_links', COUNT(*) FROM employee_store_links
    UNION ALL
    SELECT 'employees', COUNT(*) FROM employees
    UNION ALL
    SELECT 'product_categories', COUNT(*) FROM product_categories
    UNION ALL
    SELECT 'product_category_links', COUNT(*) FROM product_category_links
    UNION ALL
    SELECT 'product_models', COUNT(*) FROM product_models
    UNION ALL
    SELECT 'role_permissions', COUNT(*) FROM role_permissions
    UNION ALL
    SELECT 'roles', COUNT(*) FROM roles
    UNION ALL
    SELECT 'users', COUNT(*) FROM users;
    
    SELECT '' as '';
    SELECT '=== Sample Channel Data (Chinese Characters Test) ===' as Info;
    SELECT id, name, level1, level2 FROM channels LIMIT 5;
    "
    
    echo ""
    echo "🎉 Complete database migration finished!"
    echo "=========================================="
    echo "Expected record counts:"
    echo "- channels: 23"
    echo "- clues: 1"
    echo "- customers: 1"
    echo "- departments: 12"
    echo "- employee_store_links: 4"
    echo "- employees: 29"
    echo "- product_categories: 2"
    echo "- product_category_links: 2"
    echo "- product_models: 2"
    echo "- role_permissions: 188"
    echo "- roles: 10"
    echo "- users: 7"
    echo "=========================================="
else
    echo "❌ Database import failed"
    exit 1
fi