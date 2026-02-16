import { useEffect, useState } from 'react'
import { Card, Row, Col, Button, Tag, Typography, Spin, Empty, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CloudUploadOutlined, AppstoreOutlined } from '@ant-design/icons'
import type { Chart } from '@/types'
import { chartService } from '@/services/api'
import './ChartMarket.css'

const { Title, Text } = Typography

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
    <div className="market-container page-container">
      <div className="market-header">
        <div className="market-header-content">
          <div className="market-header-icon">
            <AppstoreOutlined />
          </div>
          <div className="market-header-text">
            <Title level={2} className="market-title">应用商店</Title>
            <Text className="market-subtitle">从 Helm Chart 仓库选择并一键部署应用到 Kubernetes</Text>
          </div>
        </div>
        <div className="market-stats">
          <div className="stat-item">
            <span className="stat-value">{charts.length}</span>
            <span className="stat-label">可用应用</span>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <Text className="loading-text">加载中...</Text>
        </div>
      ) : charts.length === 0 ? (
        <div className="empty-container">
          <Empty 
            description="暂无已上架应用" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<CloudUploadOutlined />}>
              联系管理员上架应用
            </Button>
          </Empty>
        </div>
      ) : (
        <Row gutter={[24, 24]} className="chart-grid">
          {charts.map((chart, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={chart.id}>
              <Card
                className="chart-card"
                hoverable
                cover={
                  <div className="chart-cover" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="chart-icon-wrapper">
                      <span className="chart-icon">{chart.icon || '📦'}</span>
                    </div>
                    <div className="chart-overlay">
                      <Button 
                        type="primary" 
                        icon={<CloudUploadOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeploy(chart)
                        }}
                        className="deploy-btn"
                      >
                        立即部署
                      </Button>
                    </div>
                  </div>
                }
              >
                <Card.Meta
                  title={<span className="chart-title">{chart.name}</span>}
                  description={
                    <div className="chart-meta">
                      <p className="chart-description">{chart.description}</p>
                      <div className="chart-footer">
                        <Tag color="default" className="version-tag">
                          <span className="tag-icon">📌</span>
                          {chart.versions[0]?.version || 'latest'}
                        </Tag>
                        <span className="version-count">
                          {chart.versions.length} 个版本
                        </span>
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
