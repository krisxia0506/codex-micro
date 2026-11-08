# 键盘方案示意图

`void9-voice-input.svg` 为本项目于 2026-10-23 绘制并更新的原创图，采用仓库 MIT 许可。它展示原版功能对应的九键布局（3 个 Agent 键和 6 个默认命令键）、Pro Micro/USB、ESP32/BLE 协议路线及快捷键降级边界，没有复制上游实物照片、机械模型或固件。

图中的布局和软件均为方案示意，非已实现功能；技术依据、用户确认与待验证项见 [void9 + Pro Micro 方案](../void9-pro-micro.md)。

可在本目录运行 `shasum -a 256 -c checksums.sha256` 校验图文件。

`key-matrix.svg` 为 2026-11-08 原创电路图，采用仓库 MIT 许可。包含 v0.22 的 13 轴键位、XIAO 边缘焊盘示意和 13 条开关/二极管支路。电气设计与物料依据见 [按键焊接教程](../key-matrix.md)，不是官方原理图或已验收实物。

`wiring-single.svg`、`wiring-columns.svg`、`wiring-rows.svg` 及对应 PNG 为同日原创的键盘背面分步接线图，采用 MIT 许可。键位来自当前模型，背面视图将键位、主控左右引脚与底座焊片一起镜像；元件放大，外形与线长不用于尺寸测量。PNG 为 SVG 的预览栅格图。

SVG 可由 [绘图脚本](../../../scripts/hardware/draw-wiring.py) 重建：在仓库根目录运行 `python3 scripts/hardware/draw-wiring.py`。macOS 可用 `qlmanage -t -s 1600 -o <输出目录> docs/hardware/assets/wiring-single.svg` 生成 PNG，另两图同理。更新后同步预览 PNG 和本目录校验和。
