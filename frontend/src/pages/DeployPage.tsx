import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Radio, Button, message, Space, Typography, Alert, Spin } from 'antd'
import type { RadioChangeEvent } from 'antd'
import { RocketOutlined, CodeOutlined, FormOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import yaml from 'js-yaml'
import { chartService, deployService } from '@/services/api'
import type { Chart, ChartConfig, JsonObject, JsonValue } from '@/types'

const { Title, Text } = Typography


const isPlainObject = (value: JsonValue): value is JsonObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const flattenObject = (obj: JsonObject, prefix = ''): Record<string, JsonValue> => {
  return Object.keys(obj).reduce<Record<string, JsonValue>>((acc, key) => {
    const pre = prefix.length ? `${prefix}.` : ''
    const value = obj[key]
    if (isPlainObject(value)) {
      Object.assign(acc, flattenObject(value, pre + key))
    } else {
      acc[pre + key] = value
    }
    return acc
  }, {})
}

const unflattenObject = (data: Record<string, JsonValue>): JsonObject => {
  const result: JsonObject = {}
  Object.keys(data).forEach((path) => {
    const keys = path.split('.')
    keys.reduce<JsonObject>((acc, key, index) => {
      if (index === keys.length - 1) {
        acc[key] = data[path] ?? null
        return acc
      }
      if (!isPlainObject(acc[key])) {
        acc[key] = {}
      }
      return acc[key] as JsonObject
    }, result)
  })
  return result
}

export default function DeployPage() {
  const { chartName } = useParams<{ chartName: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const chart = location.state?.chart as Chart

  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick')
  const [config, setConfig] = useState<ChartConfig | null>(null)
  const [yamlValue, setYamlValue] = useState('')
  const [form] = Form.useForm()

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const data = await chartService.getChartConfig(
          chart?.id.toString() || '',
          chart?.versions[0]?.version || ''
        )
        setConfig(data)
        setYamlValue(yaml.dump(data.default_values))
        const flatValues = flattenObject(data.default_values)
        form.setFieldsValue(flatValues)
      } catch {
        message.error('获取配置失败')
      } finally {
        setLoading(false)
      }
    }

    if (chartName && chart?.id) {
      fetchConfig()
    }
  }, [chartName, chart, form])

  const handleModeChange = (e: RadioChangeEvent) => {
    const newMode = e.target.value
    setMode(newMode)
    if (newMode === 'advanced') {
      const formValues = form.getFieldsValue()
      const currentObj = unflattenObject(formValues as Record<string, JsonValue>)
      const fullConfig: JsonObject = {
        ...(config?.default_values ?? {}),
        ...currentObj
      }
      setYamlValue(yaml.dump(fullConfig))
    } else {
      try {
        const parsed = yaml.load(yamlValue) as JsonValue
        if (!isPlainObject(parsed)) {
          throw new Error('YAML 格式错误')
        }
        const flat = flattenObject(parsed)
        form.setFieldsValue(flat)
      } catch {
        message.error('YAML 格式错误，无法切换回快捷模式')
        return
      }
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      let finalValues: JsonObject

      if (mode === 'quick') {
        await form.validateFields()
        const formValues = form.getFieldsValue() as Record<string, JsonValue>
        finalValues = unflattenObject(formValues)
      } else {
        try {
          const parsed = yaml.load(yamlValue) as JsonValue
          if (!isPlainObject(parsed)) {
            throw new Error('YAML 格式错误')
          }
          finalValues = parsed
        } catch {
          throw new Error('YAML 格式错误')
        }
      }

      if (config?.required_keys) {
        const flatValues = flattenObject(finalValues)
        const missing = config.required_keys.filter(key => {
          const val = flatValues[key]
          return val === undefined || val === null || val === ''
        })
        if (missing.length > 0) {
          throw new Error(`缺少必填参数: ${missing.join(', ')}`)
        }
      }

      await deployService.deploy({
        chart_id: chart?.id.toString() || '1',
        version: chart?.versions[0]?.version || '1.0.0',
        release_name: `${chartName}-${Date.now()}`,
        namespace: 'default',
        user_values: finalValues,
        is_quick_mode: mode === 'quick'
      })

      message.success('部署任务已提交')
      navigate('/tasks')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '部署失败'
      message.error(errorMessage)
    } finally {
      setDeploying(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>部署 {chartName}</Title>
          <Text type="secondary">{config?.description}</Text>
        </div>
        <Radio.Group value={mode} onChange={handleModeChange} buttonStyle="solid" size="large">
          <Radio.Button value="quick">
            <FormOutlined /> 快捷部署
          </Radio.Button>
          <Radio.Button value="advanced">
            <CodeOutlined /> 高级部署
          </Radio.Button>
        </Radio.Group>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {mode === 'quick' ? (
          <Form
            form={form}
            layout="vertical"
            initialValues={{}}
          >
            <Alert
              message="引导模式"
              description="仅显示管理员预设的常用配置项，其他配置将使用默认值。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 24px' }}>
              {config?.visible_keys.map(key => (
                <Form.Item
                  key={key}
                  name={key}
                  label={key}
                  rules={[{ 
                    required: config.required_keys.includes(key),
                    message: '此项必填'
                  }]}
                  tooltip={config.required_keys.includes(key) ? '此项为必填项' : undefined}
                >
                  <Input 
                    placeholder={`请输入 ${key}`} 
                    disabled={config.fixed_keys?.includes(key)} 
                    title={config.fixed_keys?.includes(key) ? '此项为固定值' : undefined}
                  />
                </Form.Item>
              ))}
            </div>
          </Form>
        ) : (
          <div>
            <Alert
              message="高级模式"
              description="您可以完全控制 values.yaml 文件。请确保格式正确。"
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}>
              <Editor
                height="500px"
                defaultLanguage="yaml"
                value={yamlValue}
                loading={<div style={{ padding: 20, textAlign: 'center' }}><Spin tip="正在加载编辑器资源..." /></div>}
                onChange={(value) => setYamlValue(value || '')}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                }}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => navigate(-1)}>取消</Button>
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              onClick={handleDeploy}
              loading={deploying}
              size="large"
            >
              开始部署
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}
