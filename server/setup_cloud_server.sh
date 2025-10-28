#!/bin/bash

# 云服务器初始化和数据库迁移脚本
# 使用方法: 在云服务器上执行此脚本

echo "=== 云服务器初始化和数据库迁移 ==="

# 1. 检查当前位置和创建工作目录
echo "当前位置: $(pwd)"
echo "当前用户: $(whoami)"

# 2. 创建项目根目录
echo "创建项目目录..."
mkdir -p /root/hxms_new
cd /root

# 3. 检查是否已有项目
if [ -d "hxms_new/.git" ]; then
    echo "发现现有Git仓库，更新代码..."
    cd hxms_new
    
    # 备份可能的冲突文件
    if [ -f "server/hxms_dev_real_backup.sql" ]; then
        cp server/hxms_dev_real_backup.sql server/hxms_dev_real_backup.sql.backup
        echo "已备份 server/hxms_dev_real_backup.sql"
    fi
    
    if [ -f "server/update_cloud_with_real_data.sh" ]; then
        cp server/update_cloud_with_real_data.sh server/update_cloud_with_real_data.sh.backup
        echo "已备份 server/update_cloud_with_real_data.sh"
    fi
    
    # 强制重置到最新版本
    git fetch origin main
    git reset --hard origin/main
    echo "代码已更新到最新版本"
else
    echo "克隆新的Git仓库..."
    # 删除可能存在的非Git目录
    rm -rf hxms_new
    
    # 克隆仓库
    git clone https://github.com/Whillin/hxms_new.git
    cd hxms_new
    echo "仓库克隆完成"
fi

# 4. 验证关键文件
echo "=== 验证关键文件 ==="
if [ ! -f "server/hxms_dev_full_backup.sql" ]; then
    echo "❌ 错误: 找不到完整备份文件 server/hxms_dev_full_backup.sql"
    exit 1
else
    echo "✅ 找到完整备份文件"
    echo "   文件大小: $(ls -lh server/hxms_dev_full_backup.sql | awk '{print $5}')"
fi

if [ ! -f "server/migrate_database.sh" ]; then
    echo "❌ 错误: 找不到迁移脚本 server/migrate_database.sh"
    exit 1
else
    echo "✅ 找到迁移脚本"
fi

# 5. 检查MySQL服务
echo "=== 检查MySQL服务 ==="
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL未安装，请先安装MySQL"
    echo "安装命令: apt update && apt install -y mysql-server"
    exit 1
fi

if ! systemctl is-active --quiet mysql; then
    echo "启动MySQL服务..."
    systemctl start mysql
    systemctl enable mysql
fi

echo "✅ MySQL服务正常"

# 6. 设置执行权限并运行迁移
echo "=== 开始数据库迁移 ==="
cd server
chmod +x migrate_database.sh

# 显示迁移脚本内容概要
echo "迁移脚本将执行以下操作:"
echo "1. 备份现有数据库"
echo "2. 删除并重建hxms_dev数据库"
echo "3. 导入完整备份数据"
echo "4. 验证导入结果"

echo ""
echo "开始执行迁移..."
./migrate_database.sh

echo "=== 迁移完成 ==="