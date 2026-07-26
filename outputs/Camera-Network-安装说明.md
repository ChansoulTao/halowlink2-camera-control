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

## 自动授权新的 Client

远程读取 Client 温度和控制指示灯需要 AP 能通过 SSH 访问 Client。如果所有
Client 使用相同的管理密码，可以启用自动授权：

```sh
opkg install sshpass
mkdir -p /etc/camera-network
printf '%s\n' '替换成统一的Client管理密码' > /etc/camera-network/client-password
chmod 600 /etc/camera-network/client-password
```

后台监控每 10 秒检查一次新连接的 Client。发现其 MAC 地址和管理 IP 后，会
自动把 AP 公钥加入 Client 的 `/etc/dropbear/authorized_keys`，之后温度和
灯光控制都通过密钥完成。密码不会显示在网页或配置导出中。

注意：这是用安全性换取便利。获得 AP root 权限的人可以读取这个统一密码，
因此不要把密码、设备备份或 SSH 私钥提交到 GitHub。

## iPad 或 Mac 同时使用有线与 Wi‑Fi

有线接口手动设置为：

- IP：`192.168.12.2`（或其他未占用的 `192.168.12.x`）
- 子网掩码：`255.255.255.0`
- 路由器：留空
- DNS：留空

这样 `https://192.168.12.1` 通过有线访问 AP，互联网仍通过 Wi‑Fi。Wi‑Fi
必须使用不同网段，例如 `192.168.10.x`。如果有线接口显示 `169.254.x.x`，
说明尚未正确配置 AP 管理网段。

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
