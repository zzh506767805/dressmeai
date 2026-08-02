# 生成前付费墙改造（2026-08-02）

## 决策

停止给新注册用户赠送免费试穿。新流程为：

`选人物图和服装图 → 登录 → 优先选择订阅（可选 $1 单次）→ 自动生成 → 失败自动退回次数`

已有用户账户中的剩余次数不清零，仍可直接使用。

## 本次实现

- 移除 NextAuth 新用户赠送免费次数的逻辑。
- 无次数用户不再跳到复杂套餐页，直接在首页显示生成付费墙。
- 付费墙主推 Basic 月订阅（每月 50 次），`$1` 单次生成作为次级选项。
- Google 登录前保存两张图片，登录后恢复图片并自动打开付费墙。
- 修复全局清理逻辑误删 base64/URL 图片的问题；图片同时从 `localStorage` 和 `sessionStorage` 清理。
- Stripe 单次结账改为必须登录，并预填账户邮箱。
- Stripe metadata 新增来源：
  - `generation_paywall`
  - `generation_paywall_subscription`
  - `pricing_single`
  - `legacy_unlock`
- 支付取消返回首页试衣区；支付成功后自动恢复原图并生成。
- 支付取消后也会恢复原图并重新打开付费墙，用户无需重新上传。
- 新增事件：
  - `paywall_shown`
  - `paywall_sign_in`
  - `paywall_subscription_click`
  - `paywall_checkout_click`
  - `checkout_created`
  - `checkout_error`
  - `checkout_cancelled`
  - `payment_success`

## 付费墙视觉

- 使用 Azure GPT Image 2 生成同一模特的四张演示素材：
  - `public/images/paywall-demo/model-base.jpg`
  - `public/images/paywall-demo/look-floral.jpg`
  - `public/images/paywall-demo/look-blazer.jpg`
  - `public/images/paywall-demo/look-coat.jpg`
- 动效为扫描线换装和三套服装自动轮播。
- 支持减少动态效果的系统设置。
- 已检查桌面与 390×844 手机布局，手机端优先露出价格和支付按钮。

## 付款承诺

- Basic 月订阅获得每月 50 次高清无水印试穿，付款后立即生成当前选择。
- 不想订阅的用户仍可用 `$1` 完成单次生成。
- 生成失败时，任务状态进入 `FAILED` 并幂等退回本次次数。
- 结果保存在账户历史中。

## 后续观察指标

- 选图完成 → 付费墙展示
- 付费墙展示 → Stripe Checkout 创建
- Checkout 创建 → 实际付款
- 实际付款 → 成功生成
- 付款后失败及退回次数
