#!/bin/bash

# 测试数据导入脚本
# 用于诊断SQL导入问题

DB_USER="root"
DB_NAME="hxms_dev"
BACKUP_FILE="hxms_dev_full_backup.sql"

echo "=========================================="
echo "数据导入测试脚本"
echo "=========================================="

# 获取数据库密码
echo "请输入MySQL密码:"
read -s DB_PASSWORD

# 测试1: 检查文件是否存在
echo "测试1: 检查备份文件..."
if [ ! -f "$BACKUP_FILE" ]; then
    echo "错误: 找不到备份文件 $BACKUP_FILE"
    exit 1
fi
echo "✓ 备份文件存在"

# 测试2: 检查文件大小
echo "测试2: 检查文件大小..."
file_size=$(wc -c < "$BACKUP_FILE")
echo "文件大小: $file_size 字节"

# 测试3: 检查文件开头
echo "测试3: 检查文件开头..."
head -n 3 "$BACKUP_FILE"

# 测试4: 检查文件结尾
echo "测试4: 检查文件结尾..."
tail -n 3 "$BACKUP_FILE"

# 测试5: 检查是否有空行在开头
echo "测试5: 检查文件开头是否有空行..."
first_line=$(head -n 1 "$BACKUP_FILE")
if [ -z "$first_line" ]; then
    echo "警告: 文件开头有空行"
else
    echo "✓ 文件开头正常"
fi

# 测试6: 尝试基本导入（不使用binary-mode）
echo "测试6: 尝试基本导入..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "错误: 数据库连接失败"
    exit 1
fi
echo "✓ 数据库连接正常"

# 测试7: 尝试导入前几行
echo "测试7: 尝试导入前10行..."
head -n 10 "$BACKUP_FILE" | mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
if [ $? -eq 0 ]; then
    echo "✓ 前10行导入成功"
else
    echo "错误: 前10行导入失败"
fi

# 测试8: 使用binary-mode导入前几行
echo "测试8: 使用binary-mode导入前10行..."
head -n 10 "$BACKUP_FILE" | mysql -u "$DB_USER" -p"$DB_PASSWORD" --binary-mode --default-character-set=utf8mb4 "$DB_NAME"
if [ $? -eq 0 ]; then
    echo "✓ binary-mode前10行导入成功"
else
    echo "错误: binary-mode前10行导入失败"
fi

echo "=========================================="
echo "测试完成"
echo "=========================================="