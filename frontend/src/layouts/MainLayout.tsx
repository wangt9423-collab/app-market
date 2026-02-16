import { Layout, Menu, Button, Dropdown, Avatar, Badge } from 'antd'
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
      icon: <span className="menu-icon">🏪</span>
    },
    {
      key: '/my-apps',
      label: '我的应用',
      icon: <span className="menu-icon">🚀</span>
    },
    {
      key: '/tasks',
      label: '部署任务',
      icon: <span className="menu-icon">📋</span>
    },
    ...(user?.role === 'admin'
      ? [{
          key: '/admin/charts',
          label: '应用上架',
          icon: <span className="menu-icon">🛠️</span>
        },
        {
          key: '/admin/users',
          label: '用户管理',
          icon: <span className="menu-icon">👥</span>
        }]
      : [])
  ]

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <div className="user-menu-item">
          <span className="menu-icon">👤</span>
          个人信息
        </div>
      )
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      label: (
        <div className="user-menu-item logout">
          <span className="menu-icon">🚪</span>
          退出登录
        </div>
      ),
      onClick: handleLogout
    }
  ]

  return (
    <Layout className="main-layout">
      <Sider 
        theme="light" 
        width={240}
        className="main-sider"
      >
        <div className="sider-logo">
          <span className="logo-icon">☸️</span>
          <span className="logo-text">App Market</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="main-menu"
        />
      </Sider>
      <Layout className="main-content-layout">
        <Header className="main-header">
          <div className="header-left">
            <h2 className="page-title">
              {menuItems.find(item => item.key === location.pathname)?.label || '应用市场'}
            </h2>
          </div>
          <div className="header-right">
            <Badge count={0} showZero={false}>
              <Button type="text" className="header-icon-btn">
                <span>🔔</span>
              </Button>
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Button type="text" className="user-dropdown-btn">
                <Avatar 
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  }}
                  icon="👤" 
                  size="small" 
                />
                <span className="username">{user?.username}</span>
                <span className="dropdown-arrow">▼</span>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="main-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
