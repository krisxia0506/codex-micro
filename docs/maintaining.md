# 仓库维护说明

本项目公开托管在 [GitHub](https://github.com/krisxia0506/codex-micro)。原创内容使用 MIT 许可证，第三方素材的例外见 [NOTICE](../NOTICE)。当前处于调研阶段，不应把文档检查成功理解为硬件或软件已可用。

## GitHub 设置基线

以下设置由仓库管理员在 GitHub 上维护，合并本文档不会自动应用设置：

- 默认分支为 `main`，启用 Issues，保留公开访问。
- `main` 要求通过 PR 合并，状态检查 `Repository checks` 成功，并要求分支与基线保持最新。
- 要求解决审阅讨论、使用线性历史，禁止强推和删除受保护分支；规则对管理员也生效。
- 不强制额外审批人数，适合目前的单维护者阶段；增加活跃维护者后再评估审批门槛。
- 仅允许 squash merge，使用 PR 标题与正文作为合并提交信息，合并后自动删除分支，并允许更新落后的 PR 分支。
- Actions 默认只有读取权限，不能创建或批准 PR；工作流显式设置 `contents: read`，不持久化 checkout 凭据。
- 启用私密漏洞报告、secret scanning 与 push protection。敏感信息不应提交，即使自动扫描没有报警。

## CI 与依赖维护

[CI 工作流](../.github/workflows/ci.yml) 在 PR、`main` 推送和手动触发时运行。唯一必需检查名称为 `Repository checks`，修改 job 名称时须同步调整分支保护，避免 PR 无法合并。

检查脚本只依赖 Python 标准库，读取 Git 跟踪的文件。新增文件需先 `git add`。脚本检查内联 Markdown 的本地目标文件和已有的 `checksums.sha256`；不检查外部链接、标题锚点、引用式链接或 HTML 链接，也不证明素材授权有效。

[Dependabot](../.github/dependabot.yml) 每周检查 GitHub Actions 更新。维护者审阅更新并等待 CI 成功后合并，不自动批准或合并依赖更新。

当前没有可执行产品，因此不配置空的产品测试或发布任务。加入固件、桌面程序或软件依赖时，应补充对应的构建、测试与依赖安全检查。
