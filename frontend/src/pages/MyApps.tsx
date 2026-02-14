import { Card, Table, Badge, Button, Modal, message } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deployService } from '@/services/api'
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

export default function MyApps() {
  const queryClient = useQueryClient()

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: deployService.getInstances
  })

  const deleteMutation = useMutation({
    mutationFn: deployService.deleteInstance,
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: () => {
      message.error('删除失败')
    }
  })

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除实例 "${name}" 吗？此操作将从 Kubernetes 集群中卸载该应用。`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        deleteMutation.mutate(id)
      }
    })
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace'
    },
    {
      title: '图表',
      dataIndex: 'chart_id',
      key: 'chart_id'
    },
    {
      title: '版本',
      dataIndex: 'chart_version',
      key: 'chart_version'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, 'warning' | 'success' | 'error' | 'default' | 'processing'> = {
          pending: 'warning',
          running: 'success',
          failed: 'error',
          unknown: 'default'
        }
        return <Badge status={colorMap[status] || 'default'} text={status} />
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: { id: number; name: string }) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id, record.name)}
        >
          删除
        </Button>
      )
    }
  ]

  return (
    <div>
      <Card title="我的应用">
        <Table
          dataSource={instances}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: '暂无已部署的应用' }}
        />
      </Card>
    </div>
  )
}
