import axios from 'axios'
import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { authService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { setToken, setUser } = useAuthStore()

  const handleLogin = async (values: { username: string; password: string }) => {
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
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card
        title="Kubernetes 应用市场"
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      >
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="用户名"
              prefix={<UserOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              placeholder="密码"
              prefix={<LockOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
