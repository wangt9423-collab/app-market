import { useEffect, useState } from 'react'
import { Table, Switch, Tag, Button, Space, Typography, message, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { chartService, repoService } from '@/services/api'
import type { Chart, Repo } from '@/types'
import ChartOnboardingWizard from '@/components/ChartOnboardingWizard'

const { Title } = Typography

export default function AdminCharts() {
  const [charts, setCharts] = useState<Chart[]>([])
  const [loading, setLoading] = useState(false)
  const [repos, setRepos] = useState<Repo[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)

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
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          disabled={record.published}
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      )
    }
  ]

  return (
    <div style={{ padding: 24 }}>
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
    </div>
  )
}
