import { Card, Table, Badge } from 'antd'
import { useQuery } from '@tanstack/react-query'

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      return []
    }
  })

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          deploy: '部署',
          upgrade: '升级',
          delete: '删除'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, 'warning' | 'success' | 'error' | 'default' | 'processing'> = {
          pending: 'warning',
          running: 'processing',
          completed: 'success',
          failed: 'error'
        }
        return <Badge status={colorMap[status] || 'default'} text={status} />
      }
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at'
    }
  ]

  return (
    <div>
      <Card title="部署任务">
        <Table
          dataSource={tasks}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: '暂无任务记录' }}
        />
      </Card>
    </div>
  )
}
