#!/bin/bash

# 修复备份文件脚本
# 解决SQL语法错误问题

BACKUP_FILE="hxms_dev_full_backup.sql"
CLEAN_FILE="hxms_dev_clean_backup.sql"

echo "=========================================="
echo "修复备份文件脚本"
echo "=========================================="

# 检查原始文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "错误: 找不到备份文件 $BACKUP_FILE"
    exit 1
fi

echo "正在修复备份文件..."

# 方法1: 移除空字符和BOM
echo "步骤1: 移除空字符和BOM..."
sed 's/\x0//g' "$BACKUP_FILE" | sed '1s/^\xEF\xBB\xBF//' > "$CLEAN_FILE.tmp1"

# 方法2: 确保文件以正确的注释开始
echo "步骤2: 确保文件格式正确..."
if [ -s "$CLEAN_FILE.tmp1" ]; then
    # 检查第一行是否为空或不是注释
    first_line=$(head -n 1 "$CLEAN_FILE.tmp1")
    if [[ -z "$first_line" || ! "$first_line" =~ ^-- ]]; then
        echo "-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)" > "$CLEAN_FILE.tmp2"
        echo "--" >> "$CLEAN_FILE.tmp2"
        echo "-- Host: localhost    Database: hxms_dev" >> "$CLEAN_FILE.tmp2"
        echo "-- ------------------------------------------------------" >> "$CLEAN_FILE.tmp2"
        echo "-- Server version	8.0.43" >> "$CLEAN_FILE.tmp2"
        echo "" >> "$CLEAN_FILE.tmp2"
        cat "$CLEAN_FILE.tmp1" >> "$CLEAN_FILE.tmp2"
    else
        cp "$CLEAN_FILE.tmp1" "$CLEAN_FILE.tmp2"
    fi
else
    echo "错误: 清理后的文件为空"
    exit 1
fi

# 方法3: 移除可能的问题字符
echo "步骤3: 移除问题字符..."
# 移除控制字符但保留换行符和制表符
tr -d '\000-\010\013\014\016-\037' < "$CLEAN_FILE.tmp2" > "$CLEAN_FILE"

# 清理临时文件
rm -f "$CLEAN_FILE.tmp1" "$CLEAN_FILE.tmp2"

# 验证清理后的文件
echo "步骤4: 验证清理后的文件..."
if [ -s "$CLEAN_FILE" ]; then
    file_size=$(wc -c < "$CLEAN_FILE")
    line_count=$(wc -l < "$CLEAN_FILE")
    echo "✓ 清理完成"
    echo "  文件大小: $file_size 字节"
    echo "  行数: $line_count"
    echo "  清理后的文件: $CLEAN_FILE"
    
    # 显示前几行
    echo "文件开头内容:"
    head -n 5 "$CLEAN_FILE"
else
    echo "错误: 清理后的文件为空"
    exit 1
fi

echo "=========================================="
echo "备份文件修复完成！"
echo "现在可以使用 $CLEAN_FILE 进行导入"
echo "=========================================="