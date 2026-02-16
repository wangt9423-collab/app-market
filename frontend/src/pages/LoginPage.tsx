import { useState } from 'react'
import axios from 'axios'
import { Form, Input, Button, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { authService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { setToken, setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const response = await authService.login(values)
      setToken(response.token)
      const role = values.username === 'admin' ? 'admin' : 'user'
      setUser({ username: values.username, role })
      message.success('登录成功')
      navigate('/')
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error || '登录失败'
        : error instanceof Error
          ? error.message
          : '登录失败'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-bg-shape shape-1"></div>
        <div className="login-bg-shape shape-2"></div>
        <div className="login-bg-shape shape-3"></div>
      </div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <span className="logo-icon">☸️</span>
            </div>
            <h1 className="login-title">Kubernetes 应用市场</h1>
            <p className="login-subtitle">一键部署应用到 Kubernetes 集群</p>
          </div>
          
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                placeholder="用户名"
                prefix={<UserOutlined />}
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                placeholder="密码"
                prefix={<LockOutlined />}
                className="login-input"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="login-button"
              >
                登 录
              </Button>
            </Form.Item>
          </Form>
          
          <div className="login-footer">
            <p>默认管理员账号: admin / 任意密码</p>
          </div>
        </div>
      </div>
    </div>
  )
}
