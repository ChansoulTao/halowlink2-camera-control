# Camera Network for HaLowLink 2

适用于运行 OpenWrt 23.05 / Morse Micro 固件的 HaLowLink 2。安装包不包含 Wi-Fi 密码、设备名称或摄影机资料。

## 安装

1. 将 `luci-app-camera-network_1.0.3-1_all.ipk` 上传到设备的 `/tmp/`。
2. SSH 登录设备。
3. 执行：

   ```sh
   opkg install /tmp/luci-app-camera-network_1.0.3-1_all.ipk
   ```

4. 浏览器打开设备 IP。登录后会进入 Camera Network。

建议先安装在 AP；如果也安装到 Client，同一个页面会自动识别 AP/Client 模式。

## 升级

上传新版安装包后执行：

```sh
opkg install --force-reinstall /tmp/luci-app-camera-network_1.0.3-1_all.ipk
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
