Delivery 五看板部署包 V1.5

入口文件：
- index.html

页面：
- pages/delivery.html   标品交付项目看板
- pages/quality.html    交付质量看板
- pages/expo.html       展会项目看板
- pages/industry.html   行业孵化项目看板
- pages/copy.html       复制项目看板

GitHub / Railway 部署说明：
1. 将仓库根目录旧文件清理掉，建议只保留本部署包中的文件。
2. 上传 index.html 与 pages 文件夹。
3. Commit 到 main 分支。
4. Railway 从该仓库 main 分支重新构建。

注意：
- 不需要 index V1.2.html、indexV3.1.html 等历史入口文件。
- Railway 网站入口必须是根目录 index.html。
