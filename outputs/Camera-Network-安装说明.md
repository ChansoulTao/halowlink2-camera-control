# Camera Network for HaLowLink 2

适用于运行 OpenWrt 23.05 / Morse Micro 固件的 HaLowLink 2。安装包不包含 Wi-Fi 密码、设备名称或摄影机资料。

## 安装

1. 将 `luci-app-camera-network_1.2.0-16_all.ipk` 上传到设备的 `/tmp/`。
2. SSH 登录设备。全新的 Client 默认关闭 SSH 时，可在 LuCI 的 Software/软件包页面上传并安装 IPK；安装后会自动启用 SSH。
3. 使用 SSH 时执行：

   ```sh
   opkg install /tmp/luci-app-camera-network_1.2.0-16_all.ipk
   ```

4. 浏览器打开设备 IP。登录后会进入 Camera Network。

AP 和 Client 都应安装同一个 IPK。AP 提供总览和远程控制，Client 上的安装负责本机灯光控制、温度读取和密钥授权。

## 新 Client 快速配对

1. 使用 HaLowLink 原厂设置页面，把新设备切换为 Client/Extender，并加入 AP 的 HaLow SSID。
2. 在新 Client 上安装同一个 Camera Network IPK。
3. 打开 AP 的 Camera Network 页面。
4. 在自动发现的 Client 卡片中点击“Pair/配对”。
5. 输入一次 Client 的管理员密码。

配对时 AP 会自动生成专用 Ed25519 密钥，把公钥写入 Client，并启用 Client 的 SSH 服务。管理员密码只用于这一次本地 HTTPS 配对请求，不会写入 UCI、文件、日志、备份或 GitHub。后续灯光控制与温度读取全部使用密钥，不再需要密码。

配对后，AP 会读取每台 Client 本机的桥接表，并根据 Client 的有线端口识别其后方 Camera。这样即使多台 Client 在 AP 上共享同一个 HaLow 无线桥端口，也不会依赖 AP 端口号猜测。一个 Camera 只能分配给一台 Client，必要时仍可在页面中手动选择。

## 升级

上传新版安装包后执行：

```sh
opkg install --force-reinstall /tmp/luci-app-camera-network_1.2.0-16_all.ipk
```

已保存的摄影机名称、置顶状态和备注位于 `/etc/config/camera_network`，升级时会保留。

## 多 Client 与 Camera 对应

- 每台 Client 和 AP 都安装相同版本的 IPK，并逐台完成配对。
- 在 `Discovered Devices` 中置顶 Camera 并设置 Camera name。
- AP 会根据每台 Client 本机的有线桥接信息自动建立对应关系；结果会同步显示在 `Client → Camera Connections`、信号历史和通电恢复区域。
- 如果一台 Client 后方发现多个设备，可在连接区域手动选择；同一 Camera 不会同时分配给两台 Client。

## A–D 机位固定地址

- A/B/C/D 是可以随项目重新分配的机位槽，不会永久绑定某一台 Camera。
- 在 AP 页面把当前 A Camera 指定到 A 槽，即为其保留 `192.168.12.50`；B/C/D 分别为 `.51`、`.52`、`.53`。
- 换项目或更换摄影机时，直接在同一槽选择新 Camera，固定地址会转给新 Camera 的 MAC，旧 Camera 不再占用该槽。
- Camera 必须使用 DHCP。分配后需要让 Camera 续租 DHCP，或重新连接网络/供电；页面会区分“已生效”和“等待重连”。
- 地址生效后可直接点击固定 IP 打开对应 Camera Web UI。

## 卸载

```sh
opkg remove luci-app-camera-network
```

## 使用提示

- 在 `Discovered Devices` 中置顶并命名摄影机。
- 点击摄影机名称或 IP 地址可打开其 Camera Control 页面。
- `Monitor` 适合 iPad 长时间监看。
- 界面会自动跟随 iPad 或系统的浅色/深色外观；iPad 左侧导航仍可触控滚动，但不会显示多余滚动条。
- AP 和每台配对 Client 均可独立调节 0–100% 整体亮度；松开滑块后保存，重启保留。关闭灯光优先，重新开启恢复原亮度。
- 原 Wi-Fi 灯显示 HaLow 信号：≥ −60 dBm 绿灯常亮；−70 至低于 −60 绿灯每 2 秒闪；−80 至低于 −70 黄灯每秒闪；低于 −80 红灯每秒闪两次；无有效连接信号时红灯每 2 秒短闪 0.1 秒。AP 显示最弱的已连接 Client，Client 显示自己到 AP 的信号。
- 紫灯显示实体 LAN 网口：网线链路未建立时灭，有链路时常亮，收发数据时闪动。不使用内部 eth0、USB 或独立 WAN 网口的状态，也不代表相机控制已经可用。
- Status 灯保持蓝色常亮。颜色与闪烁由设备后台和系统灯光驱动处理，关闭网页后仍然工作。
- 机身按钮按住至少 2 秒后松开，切换本机全部灯光，重新开启保留原亮度；短按仍为原厂 DPP 配对。AP 和 Client 各自只控制本机。原先 5/10 秒长按的重置和模式切换已取消，需要时使用原厂网页操作。
- 机身按钮状态会同步到网页：本机随页面刷新，AP 查看 Client 约每 10 秒采样；刚操作网页开关后，会留出最多 16 秒避免旧数据把新状态覆盖。升级前备份原厂按钮脚本；卸载恢复原脚本，管理员后续手动修改会保留。
- 通电恢复数据从安装后台监测服务后的下一次完整启动开始最准确。
- 不同固件版本可能需要调整 LuCI 或无线接口名称，安装前建议备份设备配置。

## 项目发布

版本号只在 `packaging/control` 的 `Version` 字段维护。发布前依次运行
`./scripts/check.sh` 和 `./scripts/build-ipk.sh`，然后创建相同版本的 Git tag
与 GitHub Release，并上传 `outputs/` 中生成的 IPK。设备备份、配置导出、密码
和 SSH 密钥不得上传。
