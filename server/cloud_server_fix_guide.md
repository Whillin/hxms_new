# 云服务器迁移问题解决指南

## 当前遇到的问题

### 问题1：Git冲突

```bash
error: Your local changes to the following files would be overwritten by merge:
        server/quick_migration.sh
Please commit your changes or stash them before you merge.
```

### 问题2：数据导入二进制字符错误

```bash
ERROR: ASCII '\0' appeared in the statement, but this is not allowed unless option --binary-mode is enabled
```

## 解决方案

### 步骤1：解决Git冲突

在云服务器上执行以下命令：

```bash
# 方法1：暂存本地更改然后拉取
git stash
git pull origin main
git stash drop

# 或者方法2：强制覆盖本地更改
git reset --hard HEAD
git pull origin main
```

**推荐使用方法2**，因为我们需要使用最新的修复版本。

### 步骤2：验证脚本更新

检查脚本是否包含最新的修复：

```bash
grep -n "binary-mode" quick_migration.sh
```

应该看到类似这样的输出：

```
87:mysql -u "$DB_USER" -p"$DB_PASSWORD" --binary-mode --default-character-set=utf8mb4 "$DB_NAME" < "$BACKUP_FILE"
```

### 步骤3：重新执行迁移

```bash
chmod +x quick_migration.sh
./quick_migration.sh
```

## 修复内容说明

最新版本的 `quick_migration.sh` 包含以下修复：

1. **表存在性检查**：避免清理不存在的表时出错
2. **二进制模式导入**：添加 `--binary-mode` 参数处理包含中文的数据
3. **字符集设置**：添加 `--default-character-set=utf8mb4` 确保正确处理UTF-8字符

## 预期结果

修复后应该看到：

```bash
✓ 数据清理完成
正在导入本地数据...
mysql: [Warning] Using a password on the command line interface can be insecure.
✓ 数据导入完成
✓ 数据验证成功
```

## 如果仍有问题

1. **检查MySQL版本**：确保MySQL版本支持 `--binary-mode` 参数
2. **检查文件编码**：确认备份文件编码正确
3. **手动导入测试**：
   ```bash
   mysql -u root -p --binary-mode --default-character-set=utf8mb4 hxms_dev < hxms_dev_full_backup.sql
   ```

## 联系支持

如果问题持续存在，请提供：

- MySQL版本信息：`mysql --version`
- 系统信息：`uname -a`
- 错误日志的完整输出
