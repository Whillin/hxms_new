# 批量导入线索脚本使用说明

脚本位置：`scripts/import-clues.mjs`

目的：读取 Excel（或 CSV）中的客户来访数据并调用后端 `/api/clue/save` 将线索提交到后台队列处理，复用系统内的客户、渠道、车型等规范化逻辑。

## 前置条件

- 已启动 MySQL 与 Redis（参考 `docker-compose.yml`）。
- 已启动后端 API（参考 `server/.env`，开发端口通常为 `http://127.0.0.1:3002`）。
- Excel 数据至少包含：日期、客户姓名、手机号（或邮箱）、渠道/来源等核心字段。

## 运行方式

在项目根目录执行：

- 使用根包别名：
  - `pnpm run import:clues -- "C:/路径/客流表.xlsx" --sheet Sheet1 --store-id 101`
  - 或 `npm run import:clues -- "C:/路径/客流表.xlsx" --sheet Sheet1 --store-id 101`

- 使用后端包别名（在 `server/` 目录执行）：
  - `pnpm run import:clues -- "C:/路径/客流表.xlsx" --sheet Sheet1 --store-id 101`

> 提示：`--store-id` 与 `--store-name` 至少二选一，若提供 `--store-name`，脚本会调用 `/api/customer/store-options` 自动解析门店 ID。

## 参数说明

- `--sheet`：工作表名，缺省取第一个工作表。
- `--server-url`：后端地址，默认 `http://127.0.0.1:3002`。
- `--user` / `--pass`：登录账号与密码，默认 `importer/123456`，若账号不存在会自动注册。
- `--store-id` / `--store-name`：门店 ID 或门店名。
- `--year`：当 Excel 日期为 `MM-DD` 时补全年份，默认当前年。
- `--dry-run`：仅解析预览，不提交后端。
- `--limit`：限制最大处理行数，便于抽样测试。

## 字段映射（常见列）

- 日期：`到店日期/来访日期/日期/visit` → `visitDate`
- 姓名：`客户姓名/顾客姓名/联系人/name` → `customerName`
- 手机：`手机号/手机/电话/联系电话/联系方式/phone` → `customerPhone`
- 顾问：`销售顾问/顾问/接待人` → `salesConsultant`
- 接待：`接待情况/是否接待/接待` → `receptionStatus`
- 渠道分类：`渠道分类/线上线下/channel` → `channelCategory`
- 业务来源：`业务来源/来源/source` → `businessSource`
- 渠道一级：`渠道一级/来源一级` → `channelLevel1`
- 渠道二级：`渠道二级/来源二级` → `channelLevel2`
- 关注车型：`关注车型/意向车型` → `focusModelName`
- 成交车型：`成交车型/实际成交车型` → `dealModelName`
- 商机级别：`商机级别/级别` → `opportunityLevel`
- 门店：脚本参数 `--store-id` 或 `--store-name`

其余诸如性别/年龄/加微/时长/人数/地区等字段均做了宽松匹配与规范化映射。

## 运行示例

```
pnpm run import:clues -- "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --server-url http://127.0.0.1:3002 --store-id 101

# 若仅知道门店名称：
pnpm run import:clues -- "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-name "天河店"

# 仅预览不提交：
pnpm run import:clues -- "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-id 101 --dry-run

# 限制处理前 50 条：
pnpm run import:clues -- "C:/Users/Administrator/Desktop/客流表.xlsx" --sheet Sheet1 --store-id 101 --limit 50
```

## 输出

- 执行结束后，会在 Excel 同目录下生成 `import-output/import-report.json`，包含统计信息：总行数、准备提交数、成功提交数、跳过数、失败数、是否为 dry-run 等。

## 常见问题

- 后端未就绪：脚本会提示，请先启动 API 与 Redis。
- 门店解析失败：确认门店已在系统中存在，或改用 `--store-id`。
- 手机/邮箱无效：脚本会跳过无效行（手机号非大陆 11 位或邮箱不合法且日期缺失）。