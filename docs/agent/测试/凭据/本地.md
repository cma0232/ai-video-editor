# 本地测试凭据

## 环境信息

| 项目 | 值 |
|------|-----|
| **Base URL** | `http://localhost:8899` |
| **启动脚本** | `./scripts/dev.sh` |
| **数据库路径** | `./data/db.sqlite` |
| **日志目录** | `./logs/` |

## 登录凭据

| 项目 | 值 |
|------|-----|
| **账号** | `xiangyugongzuoliu@gmail.com` |
| **密码** | `XXXX` |

> **提示**：本地环境可通过设置 `AUTH_ENABLED=false` 跳过登录

## 日志监控命令

```bash
# 启动服务并实时监控控制台
./scripts/dev.sh

# 另开终端监控日志文件
tail -f ./logs/app.log

# 过滤特定类型的日志
tail -f ./logs/app.log | grep -E "(ERROR|WARN|error|warn)"

# 监控 API 请求日志
tail -f ./logs/app.log | grep -E "(POST|GET|PUT|DELETE|api)"
```

## 数据库操作

```bash
# 查看任务表
sqlite3 ./data/db.sqlite "SELECT id, status, created_at FROM jobs LIMIT 10;"

# 数据库完整性检查
sqlite3 ./data/db.sqlite "PRAGMA integrity_check;"

# 清空测试数据
sqlite3 ./data/db.sqlite "DELETE FROM jobs WHERE id LIKE 'job_test%';"
```
