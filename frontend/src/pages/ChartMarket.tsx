import { useEffect, useState } from 'react'
import { Card, Row, Col, Button, Tag, Typography, Spin, Empty, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CloudUploadOutlined } from '@ant-design/icons'
import type { Chart } from '@/types'
import { chartService } from '@/services/api'
import './ChartMarket.css'

const { Title } = Typography

export default function ChartMarket() {
  const navigate = useNavigate()
  const [charts, setCharts] = useState<Chart[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCharts = async () => {
      setLoading(true)
      try {
        const data = await chartService.getCharts()
        setCharts(data)
      } catch {
        message.error('获取应用列表失败')
      } finally {
        setLoading(false)
      }
    }

    fetchCharts()
  }, [])

  const handleDeploy = (chart: Chart) => {
    navigate(`/deploy/${chart.name}`, { state: { chart } })
  }

  return (
    <div className="market-container">
      <Title level={2} className="market-title">应用商店</Title>
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      ) : charts.length === 0 ? (
        <div style={{ padding: '48px 0' }}>
          <Empty description="暂无已上架应用" />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {charts.map((chart) => (
            <Col xs={24} sm={12} md={8} lg={6} key={chart.id}>
              <Card
                className="chart-card"
                hoverable
                cover={
                  <div className="chart-icon-wrapper">
                    <span className="chart-icon">{chart.icon || '📦'}</span>
                  </div>
                }
                actions={[
                  <Button 
                    type="primary" 
                    icon={<CloudUploadOutlined />}
                    onClick={() => handleDeploy(chart)}
                    className="action-button"
                    block
                    style={{ margin: '0 16px' }}
                  >
                    部署应用
                  </Button>
                ]}
              >
                <Card.Meta
                  title={<span style={{ fontSize: 18, fontWeight: 600 }}>{chart.name}</span>}
                  description={
                    <div>
                      <div className="chart-description">{chart.description}</div>
                      <div className="version-tags">
                        <Tag color="blue">{chart.versions[0]?.version}</Tag>
                        <Tag color="cyan">{chart.versions.length} 个版本</Tag>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
