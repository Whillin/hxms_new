#!/bin/bash

# 云服务器Git冲突解决和数据库迁移脚本
# 使用方法: 将此脚本复制到云服务器并执行

echo "=== 开始解决Git冲突并执行数据库迁移 ==="

# 1. 检查当前目录
echo "当前目录: $(pwd)"
if [ ! -d ".git" ]; then
    echo "错误: 当前目录不是Git仓库"
    exit 1
fi

# 2. 备份冲突文件
echo "备份冲突文件..."
if [ -f "server/hxms_dev_real_backup.sql" ]; then
    cp server/hxms_dev_real_backup.sql server/hxms_dev_real_backup.sql.backup
    echo "已备份 server/hxms_dev_real_backup.sql"
fi

if [ -f "server/update_cloud_with_real_data.sh" ]; then
    cp server/update_cloud_with_real_data.sh server/update_cloud_with_real_data.sh.backup
    echo "已备份 server/update_cloud_with_real_data.sh"
fi

# 3. 重置冲突文件到远程版本
echo "重置冲突文件..."
git checkout HEAD -- server/hxms_dev_real_backup.sql 2>/dev/null || echo "文件 server/hxms_dev_real_backup.sql 不存在于远程"
git checkout HEAD -- server/update_cloud_with_real_data.sh 2>/dev/null || echo "文件 server/update_cloud_with_real_data.sh 不存在于远程"

# 4. 拉取最新代码
echo "拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "Git拉取失败，尝试强制重置..."
    git fetch origin main
    git reset --hard origin/main
fi

# 5. 检查是否有完整备份文件
echo "检查备份文件..."
if [ ! -f "server/hxms_dev_full_backup.sql" ]; then
    echo "错误: 找不到完整备份文件 server/hxms_dev_full_backup.sql"
    echo "请确保已正确拉取最新代码"
    exit 1
fi

# 6. 检查迁移脚本
if [ ! -f "server/migrate_database.sh" ]; then
    echo "错误: 找不到迁移脚本 server/migrate_database.sh"
    exit 1
fi

# 7. 设置执行权限
chmod +x server/migrate_database.sh

# 8. 显示文件信息
echo "=== 文件检查 ==="
echo "完整备份文件大小: $(ls -lh server/hxms_dev_full_backup.sql | awk '{print $5}')"
echo "迁移脚本: $(ls -la server/migrate_database.sh)"

# 9. 执行数据库迁移
echo "=== 开始执行数据库迁移 ==="
cd server
./migrate_database.sh

echo "=== 迁移完成 ==="