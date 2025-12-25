/**
 * 路由别名，方便快速找到页面，同时可以用作路由跳转
 */

/** 路由别名 */
export enum RoutesAlias {
  Layout = '/index/index', // 布局容器
  Login = '/auth/login', // 登录
  Register = '/auth/register', // 注册
  ForgetPassword = '/auth/forget-password', // 忘记密码
  Exception403 = '/exception/403', // 403
  Exception404 = '/exception/404', // 404
  Exception500 = '/exception/500', // 500
  Success = '/result/success', // 成功
  Fail = '/result/fail', // 失败
  Dashboard = '/dashboard/console', // 工作台
  Analysis = '/dashboard/analysis', // 分析页
  Ecommerce = '/dashboard/ecommerce', // 电子商务
  IconList = '/widgets/icon-list', // 图标列表
  IconSelector = '/widgets/icon-selector', // 图标选择器
  ImageCrop = '/widgets/image-crop', // 图片裁剪
  Excel = '/widgets/excel', // Excel
  Video = '/widgets/video', // 视频
  CountTo = '/widgets/count-to', // 计数
  WangEditor = '/widgets/wang-editor', // 富文本编辑器
  Watermark = '/widgets/watermark', // 水印
  ContextMenu = '/widgets/context-menu', // 上下文菜单
  Qrcode = '/widgets/qrcode', // 二维码
  Drag = '/widgets/drag', // 拖拽
  TextScroll = '/widgets/text-scroll', // 文字滚动
  Fireworks = '/widgets/fireworks', // 礼花效果
  Cards = '/template/cards', // 卡片
  Banners = '/template/banners', // 横幅
  Charts = '/template/charts', // 图表
  // 新增：线索列表页面别名
  ClueLeads = '/clue/leads', // 线索列表
  User = '/system/user', // 账户
  Role = '/system/role', // 角色
  UserCenter = '/system/user-center', // 用户中心
  Menu = '/system/menu', // 菜单
  Department = '/system/department', // 部门管理
  Employee = '/system/employee', // 员工管理
  Server = '/safeguard/server', // 服务器
  ChangeLog = '/change/log', // 更新日志
  ExamplesTabs = '/examples/tabs', // 标签页
  ExamplesTablesBasic = '/examples/tables/basic', // 基础表格示例
  ExamplesTables = '/examples/tables', // 高级表格示例
  ExamplesTablesTree = '/examples/tables/tree', // 左右布局表格示例
  ExamplesSearchBar = '/examples/forms/search-bar', // 搜索表单示例
  ExamplesForms = '/examples/forms', // 表单示例
  // 权限演示页面
  PermissionSwitchRole = '/examples/permission/switch-role', // 切换权限页面
  PermissionButtonAuth = '/examples/permission/button-auth', // 按钮权限演示页面
  PermissionPageVisibility = '/examples/permission/page-visibility', // 页面可见性演示页面
  // 客户与商机
  CustomerList = '/customer/list', // 客户列表
  OpportunityList = '/opportunity/list', // 商机列表
  OpportunityFollow = '/opportunity/follow', // 跟进记录
  // 渠道模块
  ChannelOnlineDaily = '/channel/online/daily', // 线上渠道每日填报
  // 产品模块（补齐缺失别名）
  ProductCategory = '/product/category', // 产品分类
  ProductManagement = '/product/management', // 产品管理
  // 模板页面（补齐缺失别名）
  Map = '/template/map', // 地图
  Calendar = '/template/calendar', // 日历
  Pricing = '/template/pricing', // 定价页
  // 文章模块（补齐缺失别名）
  ArticleList = '/article/list', // 文章列表
  ArticleDetail = '/article/detail', // 文章详情
  Comment = '/article/comment', // 评论
  ArticlePublish = '/article/publish' // 发布
}
