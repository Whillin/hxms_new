#!/bin/bash

# 手动云服务器设置脚本 - 解决GitHub连接问题
# 使用方法: 在云服务器上执行此脚本

echo "=== 手动云服务器设置和数据库迁移 ==="

# 1. 创建项目目录结构
echo "创建项目目录结构..."
mkdir -p /root/hxms_new/server
cd /root/hxms_new

# 2. 初始化Git仓库
echo "初始化Git仓库..."
git init
git remote add origin https://github.com/Whillin/hxms_new.git

# 3. 尝试不同的GitHub镜像源
echo "尝试连接GitHub..."

# 方法1: 使用GitHub镜像
echo "尝试使用GitHub镜像..."
git remote set-url origin https://github.com.cnpmjs.org/Whillin/hxms_new.git
git fetch origin main 2>/dev/null && echo "GitHub镜像连接成功" || {
    echo "GitHub镜像连接失败，尝试其他方法..."
    
    # 方法2: 使用FastGit镜像
    git remote set-url origin https://hub.fastgit.xyz/Whillin/hxms_new.git
    git fetch origin main 2>/dev/null && echo "FastGit镜像连接成功" || {
        echo "所有Git镜像都连接失败"
        echo "请手动上传文件或配置代理"
        exit 1
    }
}

# 4. 拉取代码
echo "拉取最新代码..."
git pull origin main
git checkout main

# 5. 验证关键文件
echo "=== 验证关键文件 ==="
if [ ! -f "server/hxms_dev_full_backup.sql" ]; then
    echo "❌ 错误: 找不到完整备份文件"
    echo "请手动创建备份文件或上传文件"
    
    # 创建临时的数据库迁移脚本
    cat > server/create_database.sql << 'EOF'
-- 临时数据库创建脚本
CREATE DATABASE IF NOT EXISTS hxms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hxms_dev;

-- 如果有备份文件，请手动导入
-- mysql -u root -p hxms_dev < hxms_dev_full_backup.sql
EOF
    
    echo "已创建临时数据库脚本: server/create_database.sql"
    echo "请手动上传 hxms_dev_full_backup.sql 文件到 server/ 目录"
    exit 1
else
    echo "✅ 找到完整备份文件"
    echo "   文件大小: $(ls -lh server/hxms_dev_full_backup.sql | awk '{print $5}')"
fi

if [ ! -f "server/migrate_database.sh" ]; then
    echo "❌ 错误: 找不到迁移脚本"
    
    # 创建简化的迁移脚本
    cat > server/migrate_database.sh << 'EOF'
#!/bin/bash

echo "=== 开始数据库迁移 ==="

# 检查MySQL服务
if ! systemctl is-active --quiet mysql; then
    echo "启动MySQL服务..."
    systemctl start mysql
fi

# 备份现有数据库
echo "备份现有数据库..."
mysqldump -u root -p hxms_dev > hxms_dev_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo "无现有数据库需要备份"

# 删除并重建数据库
echo "重建数据库..."
mysql -u root -p -e "DROP DATABASE IF EXISTS hxms_dev; CREATE DATABASE hxms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 导入完整备份
echo "导入完整备份..."
if [ -f "hxms_dev_full_backup.sql" ]; then
    mysql -u root -p hxms_dev < hxms_dev_full_backup.sql
    echo "✅ 数据库导入完成"
else
    echo "❌ 找不到备份文件 hxms_dev_full_backup.sql"
    exit 1
fi

# 验证导入结果
echo "=== 验证导入结果 ==="
mysql -u root -p -e "USE hxms_dev; SHOW TABLES; SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='hxms_dev';"

echo "=== 迁移完成 ==="
EOF
    
    chmod +x server/migrate_database.sh
    echo "✅ 已创建迁移脚本"
else
    echo "✅ 找到迁移脚本"
fi

# 6. 检查MySQL服务
echo "=== 检查MySQL服务 ==="
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL未安装，安装MySQL..."
    apt update
    apt install -y mysql-server
fi

if ! systemctl is-active --quiet mysql; then
    echo "启动MySQL服务..."
    systemctl start mysql
    systemctl enable mysql
fi

echo "✅ MySQL服务正常"

# 7. 执行数据库迁移
echo "=== 开始数据库迁移 ==="
cd server
chmod +x migrate_database.sh

echo "准备执行数据库迁移..."
echo "请确保MySQL root密码已设置"
echo "执行命令: ./migrate_database.sh"

echo "=== 设置完成 ==="
echo "如果Git克隆失败，请手动上传以下文件到 /root/hxms_new/server/ 目录:"
echo "1. hxms_dev_full_backup.sql"
echo "2. migrate_database.sh"
echo "然后执行: cd /root/hxms_new/server && ./migrate_database.sh"
EOF