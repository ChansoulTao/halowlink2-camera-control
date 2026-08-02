# Camera Network for HaLowLink 2

适用于运行 OpenWrt 23.05 / Morse Micro 固件的 HaLowLink 2。安装包不包含 Wi-Fi 密码、设备名称或摄影机资料。

## 安装

1. 将 `luci-app-camera-network_1.1.4-1_all.ipk` 上传到设备的 `/tmp/`。
2. SSH 登录设备。全新的 Client 默认关闭 SSH 时，可在 LuCI 的 Software/软件包页面上传并安装 IPK；安装后会自动启用 SSH。
3. 使用 SSH 时执行：

   ```sh
   opkg install /tmp/luci-app-camera-network_1.1.4-1_all.ipk
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

## 升级

上传新版安装包后执行：

```sh
opkg install --force-reinstall /tmp/luci-app-camera-network_1.1.4-1_all.ipk
```

已保存的摄影机名称、置顶状态和备注位于 `/etc/config/camera_network`，升级时会保留。

## 卸载

```sh
opkg remove luci-app-camera-network
```

## 使用提示

- 在 `Discovered Devices` 中置顶并命名摄影机。
- 点击摄影机名称可打开其 Camera Control 页面。
- `Monitor` 适合 iPad 长时间监看。
- 通电恢复数据从安装后台监测服务后的下一次完整启动开始最准确。
- 不同固件版本可能需要调整 LuCI 或无线接口名称，安装前建议备份设备配置。
