import { useEffect, useState } from 'react'
import { Table, Button, Space, Typography, message, Modal, Form, Input, Select, Tag, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons'
import { userService } from '@/services/api'
import type { UserInfo, CreateUserRequest, UpdateUserRequest } from '@/types'

const { Title } = Typography

export default function AdminUsers() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)
  const [createForm] = Form.useForm<CreateUserRequest>()
  const [editForm] = Form.useForm<UpdateUserRequest>()
  const [resetPasswordForm] = Form.useForm<{ password: string }>()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await userService.getUsers(page, pageSize)
      setUsers(data.users)
      setTotal(data.total)
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize])

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      await userService.createUser(values)
      message.success('创建用户成功')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchUsers()
    } catch (err: any) {
      if (err.errorFields) {
        return // 表单验证失败
      }
      message.error(err.response?.data?.error || '创建用户失败')
    }
  }

  const handleEdit = async () => {
    if (!currentUser) return
    try {
      const values = await editForm.validateFields()
      await userService.updateUser(currentUser.id, values)
      message.success('更新用户成功')
      setEditModalOpen(false)
      setCurrentUser(null)
      editForm.resetFields()
      fetchUsers()
    } catch (err: any) {
      if (err.errorFields) {
        return
      }
      message.error(err.response?.data?.error || '更新用户失败')
    }
  }

  const handleDelete = async (user: UserInfo) => {
    try {
      await userService.deleteUser(user.id)
      message.success('删除用户成功')
      fetchUsers()
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除用户失败')
    }
  }

  const handleResetPassword = async () => {
    if (!currentUser) return
    try {
      const values = await resetPasswordForm.validateFields()
      await userService.resetPassword(currentUser.id, values.password)
      message.success('重置密码成功')
      setResetPasswordModalOpen(false)
      setCurrentUser(null)
      resetPasswordForm.resetFields()
    } catch (err: any) {
      if (err.errorFields) {
        return
      }
      message.error(err.response?.data?.error || '重置密码失败')
    }
  }

  const openEditModal = (user: UserInfo) => {
    setCurrentUser(user)
    editForm.setFieldsValue({
      email: user.email,
      role: user.role,
      status: user.status
    })
    setEditModalOpen(true)
  }

  const openResetPasswordModal = (user: UserInfo) => {
    setCurrentUser(user)
    resetPasswordForm.resetFields()
    setResetPasswordModalOpen(true)
  }

  const columns: ColumnsType<UserInfo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => text || '-'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '激活' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<KeyOutlined />}
            onClick={() => openResetPasswordModal(record)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除用户 "${record.username}" 吗？`}
            onConfirm={() => handleDelete(record)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="page-container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>用户管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            创建用户
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          }
        }}
      />

      {/* 创建用户弹窗 */}
      <Modal
        title="创建用户"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
          >
            <Input placeholder="请输入邮箱（可选）" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户弹窗 */}
      <Modal
        title="编辑用户"
        open={editModalOpen}
        onOk={handleEdit}
        onCancel={() => {
          setEditModalOpen(false)
          setCurrentUser(null)
          editForm.resetFields()
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="email"
            label="邮箱"
          >
            <Input placeholder="请输入邮箱（可选）" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
          >
            <Select placeholder="请选择角色">
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
          >
            <Select placeholder="请选择状态">
              <Select.Option value="active">激活</Select.Option>
              <Select.Option value="inactive">禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal
        title="重置密码"
        open={resetPasswordModalOpen}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetPasswordModalOpen(false)
          setCurrentUser(null)
          resetPasswordForm.resetFields()
        }}
        okText="确认重置"
        cancelText="取消"
      >
        <p>为用户 <strong>{currentUser?.username}</strong> 重置密码：</p>
        <Form form={resetPasswordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
