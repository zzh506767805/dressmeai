# Cloudflare 免费额度用量核查

核查日期：2026-11-07，北京时间约 17:45。仅只读查询 Azure 生产数据库与平台监控；未改代码、生产数据、配置或计费。

## 结论

当前存储容量和请求量均明显低于 Cloudflare 免费额度，没有为了容量改用飞书附件图床的必要。免费 Workers 能否稳定运行现有应用仍取决于运行环境兼容性及每请求 CPU，不能用流量小代替实际部署验证。D1 的行读写额度也需迁移后测量，不把 PostgreSQL 用户数或 API 请求数直接当作 D1 行读写数。

## 数据库实时统计

生产连接来源为 Azure Static Web App `dressmeai`（资源组 `出海去`）的应用设置，连接目标确认是 `dressmeai-db.postgres.database.azure.com`。通过 psql 强制 `default_transaction_read_only=on`，设置连接与语句超时。未输出连接密码或客户个人信息。

数据库截点：2026-11-07 09:45:14 UTC（北京时间 17:45:14）。

| 项目 | 数值 |
| --- | ---: |
| 注册账户总数 | 997 |
| 最近 30 天新注册 | 87 |
| 历史试衣任务 | 178 |
| 成功 / 失败任务 | 118 / 60 |
| 最近 30 天 / 7 天新任务 | 3 / 0 |
| 最近一次任务创建 | 2026-10-13 11:01:15 北京时间 |
| 数据库 Payment 记录 | 15 |
| 最近 30 天 Payment 新记录 | 1 |
| 保存的人物照记录 | 142 |
| PostgreSQL 整库磁盘占用 | 11,910,167 字节，约 11.91MB |
| 业务表含索引占用合计 | 3,547,136 字节，约 3.55MB |

整库占用包含 PostgreSQL 自身开销，不能视为迁移后 D1 的精确文件大小。以整库约 11.91MB 粗略对照 D1 Free 单库 500MB，上限占用约 2.4%。表统计中的估计行数与实际计数不一致，因此账户及任务数量使用实时 count，不使用估计行数。Payment 记录包含历史测试及可能的记账缺口，本次不据此统计真实收入。

## Azure 图片监控

资源：`dressmeai-rg / dressmeaiupload / blobServices/default`。统计窗口约 2026-10-08 09:45 UTC 至 2026-11-07 09:45 UTC，按 P1D 聚合；容量最新可用点为 2026-11-06 09:45 UTC 的区间平均值，不是精确逐文件清点。

| 指标 | 数值 |
| --- | ---: |
| 最新区间平均存储 | 51,383,213 字节，约 51.38MB |
| 最新区间平均文件数量 | 537 |
| 近 30 天存储操作 | 559 |
| 近 30 天流入 | 780,247 字节，约 0.78MB |
| 近 30 天流出 | 51,948,918 字节，约 51.95MB |

现有图片规模约为 R2 10GB 免费存储量的 0.51%。以当前容量维持整月，远低于 10GB-month。Azure 操作数并非 R2 精确 A/B 类计费操作数，但 559 次总操作相对 R2 每月 100 万 A 类、1000 万 B 类额度有很大余量。R2 公网出站免费；图片若由 Worker 代理，仍消耗 Worker 动态请求。Cloudflare 免费额度按账户共享，其他项目占用未在此次 Azure 单项目查询中核实。

## Azure 网站监控

资源：`Microsoft.Web/staticSites/dressmeai`。窗口约 2026-10-08 09:45 UTC 至 2026-11-07 09:45 UTC，按小时查询；日峰值为 UTC 自然日汇总，首尾为不完整日。

| 指标 | 30 天合计 | 日均（总量 / 30） | 观测日峰值 |
| --- | ---: | ---: | ---: |
| SiteHits | 32,678 | 1,089 | 1,684 |
| FunctionHits | 31,790 | 1,060 | 2,497 |
| BytesSent | 2,157,765,420 字节，约 2.16GB | 约 71.93MB | 约 117.27MB |

SiteHits 与 FunctionHits 是平台分别提供的监控指标，不能相加后宣称为去重访客或精确 Worker 请求量。现有 FunctionHits 观测日峰值约为 Workers Free 10 万动态请求/日的 2.5%。即便粗略把两个指标的峰值相加作为更保守的压力参照，也约 4,181 次/日，远低于 10 万；这不是迁移后的精确请求预测。

CdnRequestCount 未返回有效数据，不能表述为 CDN 请求为零。FunctionHits 有 718 个非空小时点，BytesSent 有 603 个非空点，因此合计是平台已返回数据的汇总，不宣称覆盖所有可能缺失流量。网站请求含资源、接口和可能的机器人，不等于真人访问数。

## 决策建议

1. 按当前规模，采用 Workers Free + R2 Standard 免费额度 + D1 Free 有充分容量余量。
2. 先用预发布环境实测构建与登录、支付验签、图片上传、生成状态查询的 CPU。Workers Free 每请求 10ms CPU；网络等待不计 CPU，但 sharp 原生图片处理无法照搬，SSR、签名和大 base64 处理也需验证。
3. 迁移后监控真实 Worker 请求及 CPU、D1 行读写、R2 操作和容量。此前额度调研来源见迁移计划，执行时再次核实官方额度及账户其他服务占用。
4. R2 超出免费额度会计费，通常需要支付方式；免费额度不等于账单自动封顶。AI 调用、Stripe 手续费与域名不属于此次免费托管结论。
5. 飞书图床不会解决当前实际容量瓶颈，因为目前没有容量瓶颈；若仍选择飞书，应基于运营偏好，并实测临时链接刷新及阿里云抓图。

关联计划：`cloudflare-migration-plan-2026-11-07.md`。

官方额度依据：
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
