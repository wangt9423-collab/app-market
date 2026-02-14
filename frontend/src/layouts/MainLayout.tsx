import { Layout, Menu, Button, Dropdown, Avatar } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import './MainLayout.css'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    {
      key: '/',
      label: '应用商店',
      icon: '📦'
    },
    {
      key: '/my-apps',
      label: '我的应用',
      icon: '🚀'
    },
    {
      key: '/tasks',
      label: '部署任务',
      icon: '📋'
    },
    ...(user?.role === 'admin'
      ? [{
          key: '/admin/charts',
          label: '应用上架',
          icon: '🛠️'
        },
        {
          key: '/admin/users',
          label: '用户管理',
          icon: '👥'
        }]
      : [])
  ]

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人信息',
      onClick: () => navigate('/profile')
    },
    {
      key: 'logout',
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="header">
        <div className="header-content">
          <div className="logo">Kubernetes 应用市场</div>
          <div className="user-info">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" className="user-button">
                <Avatar icon="👤" size="small" />
                <span className="username">{user?.username}</span>
              </Button>
            </Dropdown>
          </div>
        </div>
      </Header>
      <Layout>
        <Sider theme="light" width={200}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems.map(item => ({
              key: item.key,
              label: item.label,
              icon: <span>{item.icon}</span>,
              onClick: () => navigate(item.key)
            }))}
          />
        </Sider>
        <Content className="content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
