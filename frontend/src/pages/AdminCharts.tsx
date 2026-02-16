import { useEffect, useState } from 'react'
import { Table, Switch, Tag, Button, Space, Typography, message, Modal, Form, Input } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, PlusOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { chartService, repoService } from '@/services/api'
import type { Chart, Repo } from '@/types'
import ChartOnboardingWizard from '@/components/ChartOnboardingWizard'

const { Title } = Typography
const { TextArea } = Input

export default function AdminCharts() {
  const [charts, setCharts] = useState<Chart[]>([])
  const [loading, setLoading] = useState(false)
  const [repos, setRepos] = useState<Repo[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingChart, setEditingChart] = useState<Chart | null>(null)
  const [editForm] = Form.useForm()

  const fetchCharts = async () => {
    setLoading(true)
    try {
      const data = await chartService.getAdminCharts()
      setCharts(data)
    } catch {
      message.error('获取应用列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchRepos = async () => {
    try {
      const data = await repoService.getRepos()
      setRepos(data)
    } catch {
      message.error('获取仓库列表失败')
    }
  }

  useEffect(() => {
    fetchCharts()
    fetchRepos()
  }, [])

  const handlePublishChange = async (chart: Chart, published: boolean) => {
    try {
      await chartService.updateChartPublishStatus(chart.id, published)
      setCharts(prev => prev.map(item => item.id === chart.id ? { ...item, published } : item))
      message.success(published ? '应用已上架' : '应用已下架')
    } catch {
      message.error('更新状态失败')
    }
  }

  // 编辑应用信息
  const handleEdit = (chart: Chart) => {
    setEditingChart(chart)
    editForm.setFieldsValue({
      name: chart.name,
      description: chart.description,
      icon: chart.icon,
      home: chart.home
    })
    setEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editingChart) return
    try {
      const values = await editForm.validateFields()
      await chartService.updateChart(editingChart.id, values)
      setCharts(prev => prev.map(item => 
        item.id === editingChart.id ? { ...item, ...values } : item
      ))
      message.success('更新成功')
      setEditModalOpen(false)
    } catch {
      message.error('更新失败')
    }
  }

  const handleDelete = (chart: Chart) => {
    if (chart.published) {
      message.error('请先下架应用再删除')
      return
    }

    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除应用 "${chart.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await chartService.deleteChart(chart.id)
          message.success('删除成功')
          fetchCharts()
        } catch (err: any) {
          message.error(err.response?.data?.error || '删除失败')
        }
      }
    })
  }

  const columns: ColumnsType<Chart> = [
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span>{record.icon || '📦'}</span>
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '版本',
      key: 'versions',
      render: (_, record) => (
        <Space>
          <Tag color="blue">{record.versions?.[0]?.version || '-'}</Tag>
          <Tag color="cyan">{record.versions?.length || 0} 个版本</Tag>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'published',
      key: 'published',
      render: (published: boolean | undefined, record) => (
        <Switch
          checked={!!published}
          onChange={(checked) => handlePublishChange(record, checked)}
          checkedChildren="上架"
          unCheckedChildren="下架"
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            disabled={record.published}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div className="page-container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>应用上架管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCharts}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>上架应用</Button>
        </Space>
      </div>
      
      <Table
        rowKey="id"
        columns={columns}
        dataSource={charts}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      
      {wizardOpen && (
        <ChartOnboardingWizard
          open={wizardOpen}
          onCancel={() => setWizardOpen(false)}
          onSuccess={() => {
            setWizardOpen(false)
            fetchCharts()
          }}
          repos={repos}
        />
      )}

      <Modal
        title="编辑应用信息"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="应用名称" rules={[{ required: true, message: '请输入应用名称' }]}>
            <Input placeholder="请输入应用名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入应用描述" />
          </Form.Item>
          <Form.Item name="icon" label="图标URL">
            <Input placeholder="https://example.com/icon.png" />
          </Form.Item>
          <Form.Item name="home" label="首页URL">
            <Input placeholder="https://example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
