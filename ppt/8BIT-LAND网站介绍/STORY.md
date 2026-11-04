# 8BIT★LAND 网站介绍 · 叙事方案

## ① 用户意图对齐

- **目标受众**：同学、老师、朋友——用一份成品页面展示「我自己做了一个能弹能玩的音乐网站」。场合偏向作品展示 / 课堂分享 / 发给别人看。
- **核心目标**：看完记住三件事——① 它把「做 8bit 音乐」拆成了三个零门槛入口；② 它是纯前端、无外部依赖，双击就能跑；③ 连字体和配色都是自己抠到像素级的。
- **PPT 长度**：8 页。Hero 配额 2 页（25%）。
- **视觉调性**：像素复古 / 蒸汽波霓虹 / 桌面窗口 / 克制不花哨。
- **内容边界**：必讲三大模块的作用与关键规则、技术上的「三个 0」、视觉上的两套主题与像素字体；不讲商业价值、不做竞品对比、不放代码片段堆砌。

## ② 页面骨架

| 页 | 章节 | 类型 | 角色 | rhythm | 版式 |
| :- | :--- | :--- | :--- | :--- | :--- |
| 01 | 封面 | cover | hero | peak | 全幅图+骑线文字 |
| 02 | 为什么做 | content | supporting | valley | 非对称双栏 65:35 |
| 03 | 模块一 | content | supporting | peak | 左大图+右侧文字 |
| 04 | 模块二 | content | supporting | valley | 上大图+下方卡片 |
| 05 | 模块三 | content | supporting | peak | 左标题+右内容 |
| 06 | 技术 | content | supporting | valley | 巨型数字+洞察 |
| 07 | 设计 | content | supporting | peak | 非对称双栏 60:40 |
| 08 | 结束 | ending | hero | peak | 居中金句 |

- 章节目录页：**不做目录**（8 页以内，三模块本身就是主线），因此 section 扉页 = 0，契约自洽。
- 非对称版式占比 7/8 = 87.5%（门槛 40%）。
- `左大图+右侧文字` + `非对称双栏` 合计 3 页 = 37.5%（门槛 40%）。
- `N卡片横排` 0 次；对称版式仅结束页 1 页。
- 相邻页版式无重复；无连续 3 页 valley。

## ③ 页面大纲

### 01 封面 · 8BIT★LAND
- type: cover / role: hero / rhythm: peak / layout: 全幅图+骑线文字 / visual_role: atmosphere
- visual: `L1: bg_cover.png`（全幅铺满，压暗后作为空间底）
- density: 字数约 40 / 图片 1 张 / 留白约 45%
- description: 主标题 8BIT★LAND，副标「一个可以随手玩的 8bit 音乐工坊」，角标写「纯前端 · 零依赖 · 双击即开」。
- anti_pattern: 禁止居中对称排布标题+副标+三个并排小图标；禁止给底图加浅色蒙版导致像素网格被冲淡。

### 02 门槛不在灵感，在工具
- type: content / role: supporting / rhythm: valley / layout: 非对称双栏 65:35 / visual_role: evidence
- visual: `L1: ui_boot.png`（右侧 65% 窄栏，作为"入口画面"证据）
- density: 字数约 210 / 图片 1 张 / 留白约 22%
- description: 做音乐的传统路径要装 DAW、买音源、学五线谱，三座门槛把「想玩一下」的人挡在门外。8BIT★LAND 把这三件事拆成三个互不依赖的入口，任何一步都不需要前置知识——打开网页就等于开机。
- anti_pattern: 禁止三张等宽卡片并列讲门槛；禁止把启动页截图缩成 200×70 的角标。

### 03 模块一 · 随心和声
- type: content / role: supporting / rhythm: peak / layout: 左大图+右侧文字 / visual_role: anchor
- visual: `L1: ui_lucky.png`（左侧 58%，产品主视觉）
- density: 字数约 200 / 图片 1 张 / 留白约 18%
- description: 敲任意字母键就会落一个音，界面同时在随机位置放一个像素小鬼和礼花。听着像瞎弹，其实每条旋律都被和弦进行约束：8 小节 4/4，强拍必须落在当前和弦音上，弱拍优先级进，大跳之后强制反向——所以 100% 不会难听。
- anti_pattern: 禁止把界面截图压成半屏截图的一半；禁止用等宽三卡讲规则。

### 04 模块二 · 像素作曲机
- type: content / role: supporting / rhythm: valley / layout: 上大图+下方卡片 / visual_role: anchor
- visual: `L1: ui_comp.png`（上半部 62%，钢琴卷帘全貌）
- density: 字数约 230 / 图片 1 张 / 留白约 15%
- description: 键盘就是琴键，A S D F G H J K L 是白键、W E T Y U O P 是黑键。按播放后边听边敲，音符会自己写进格子里；也能拿鼠标点格子改音高、拖长短。做完一键存成 WAV。
- anti_pattern: 禁止把钢琴卷帘截图裁掉琴键部分；禁止下方三卡因为字数不同而高度参差。

### 05 模块三 · 8BIT 转换器
- type: content / role: supporting / rhythm: peak / layout: 左标题+右内容 / visual_role: anchor
- visual: `L1: ui_conv.png`（右侧 68%，转换器全貌）
- density: 字数约 220 / 图片 1 张 / 留白约 16%
- description: 拖一首歌进来，先降到 11,025 Hz、再压到 4 bit，混单声道、加芯片过载，就得到那种"电子垃圾味"。关键是三步：先试听确认、再调参数、满意了才导出——不会一键毁掉原曲。
- anti_pattern: 禁止把三个步骤画成等宽卡片；禁止把「试听」这步用角标一带而过。

### 06 三个 0
- type: content / role: supporting / rhythm: valley / layout: 巨型数字+洞察 / visual_role: anchor
- visual: `0` `3.6MB` `60KB` 巨型数字组（≥ 120px）+ SVG 链路示意
- density: 字数约 190 / 图 0 张（SVG 结构图 1 个）/ 留白约 20%
- description: 0 个音频文件——所有声音由 Web Audio 现场合成方波、脉冲、三角、锯齿与白噪声；3.6MB 整个站点——其中 3.2MB 是内联的中文点阵字体；60KB 的 app.js 干完了合成、绘制、编码三件事。所以它能离线、能双击打开、不用装任何东西。
- anti_pattern: 禁止把三个数字塞进等宽卡片；禁止只摆数字不给「所以能离线」这个判断。

### 07 两套主题，一套网格
- type: content / role: supporting / rhythm: peak / layout: 非对称双栏 60:40 / visual_role: anchor
- visual: `L1: ui_candy_desktop.png`（左 60%）+ 右侧文字与像素网格示意
- density: 字数约 210 / 图片 1 张 / 留白约 20%
- description: 默认是深紫蒸汽波，切一下变成粉彩糖果桌面——壁纸、窗口、按钮、任务栏、连画布里的配色都整套换掉。两套皮肤共用同一套 12 像素网格：字体是 M+ HZK12，1200 单位正好等于 12 像素，1 个设计像素 = 1 个屏幕像素，所以方块边缘没有灰边。
- anti_pattern: 禁止把两张主题截图做成 50:50 等分对比；禁止用非像素字体讲像素字体。

### 08 结束
- type: ending / role: hero / rhythm: peak / layout: 居中金句/巨型数字 / visual_role: anchor
- density: 字数约 30 / 图片 0 张 / 留白约 50%
- description: 「打开就能弹，关掉不留痕。」——不登录、不上传、不联网，声音全在你的浏览器里现场长出来。
- anti_pattern: 禁止再放一遍产品截图；禁止在结束页堆三个行动按钮。
