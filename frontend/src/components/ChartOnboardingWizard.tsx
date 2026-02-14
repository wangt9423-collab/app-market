import { useState } from 'react'
import { Modal, Steps, Form, Input, Button, Upload, message, Typography, Select, Row, Col, Checkbox, Tree, Alert, Descriptions } from 'antd'
import { InboxOutlined, RocketOutlined, CodeOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import Editor from '@monaco-editor/react'
import yaml from 'js-yaml'
import { chartService } from '@/services/api'
import type { Repo, ParsedChartInfo, JsonObject } from '@/types'

const { Dragger } = Upload
const { Title, Text } = Typography

interface ChartOnboardingWizardProps {
  open: boolean
  onCancel: () => void
  onSuccess: () => void
  repos: Repo[]
}

const flattenKeys = (obj: any, prefix = ''): string[] => {
  return Object.keys(obj).reduce<string[]>((acc, key) => {
    const pre = prefix.length ? `${prefix}.` : ''
    const value = obj[key]
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      acc.push(pre + key)
      acc.push(...flattenKeys(value, pre + key))
    } else {
      acc.push(pre + key)
    }
    return acc
  }, [])
}

export default function ChartOnboardingWizard({ open, onCancel, onSuccess, repos }: ChartOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [parsedInfo, setParsedInfo] = useState<ParsedChartInfo | null>(null)
  
  // Form Data
  const [form] = Form.useForm()
  const [baseInfo, setBaseInfo] = useState<any>({}) // Store Step 0 data
  
  // Config Data
  const [yamlValue, setYamlValue] = useState('')
  const [allKeys, setAllKeys] = useState<string[]>([])
  
  // Key Config States
  const [visibleKeys, setVisibleKeys] = useState<string[]>([])
  const [requiredKeys, setRequiredKeys] = useState<string[]>([])
  const [fixedKeys, setFixedKeys] = useState<string[]>([])

  const handleParse = async (file: File) => {
    setLoading(true)
    try {
      const info = await chartService.parseChart(file)
      setParsedInfo(info)
      setYamlValue(yaml.dump(info.DefaultValues))
      
      // Auto-fill form
      form.setFieldsValue({
        name: info.Name,
        description: info.Description,
        icon: info.Icon,
        home: info.Home,
        version: info.Version,
        app_version: info.AppVersion
      })
      
      // Flatten keys for config
      const keys = flattenKeys(info.DefaultValues)
      setAllKeys(keys)
      // Default: all keys visible
      setVisibleKeys(keys)
      
      message.success('解析成功')
      // Don't auto-advance, let user check info
    } catch (error) {
      message.error('解析失败')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { title: '基本信息', description: '应用元数据' },
    { title: '上传应用', description: '解析 Chart 包' },
    { title: '参数配置', description: '定制 Values' },
    { title: '确认提交', description: '完成上架' },
  ]

  const next = async () => {
    if (currentStep === 0) {
      try {
        const values = await form.validateFields()
        setBaseInfo(values) // Save form data before unmounting
        setCurrentStep(currentStep + 1)
      } catch {
        return
      }
    } else if (currentStep === 1) {
      if (!parsedInfo) {
        message.warning('请先上传并解析 Chart 包')
        return
      }
      setCurrentStep(currentStep + 1)
    } else if (currentStep === 2) {
      // Validate YAML
      try {
        yaml.load(yamlValue)
        setCurrentStep(currentStep + 1)
      } catch {
        message.error('YAML 格式错误')
      }
    } else {
      handleSubmit()
    }
  }

  const prev = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Use saved baseInfo instead of re-validating unmounted form
      const adminDefaults = yaml.load(yamlValue) as JsonObject
      
      const metadata = {
        repo_id: baseInfo.repo_id,
        name: baseInfo.name,
        description: baseInfo.description,
        icon: baseInfo.icon,
        home: baseInfo.home,
        published: baseInfo.published,
        default_values: adminDefaults,
        required_keys: requiredKeys,
        visible_keys: visibleKeys,
        fixed_keys: fixedKeys
      }

      const file = fileList[0].originFileObj as File
      await chartService.onboardChart(file, metadata)
      
      message.success('应用上架成功')
      onSuccess()
    } catch (error) {
      message.error('上架失败')
    } finally {
      setLoading(false)
    }
  }

  // Render Step Content
  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form form={form} layout="vertical" initialValues={{ published: true, repo_id: repos[0]?.id }}>
             <Form.Item
              label="归属仓库"
              name="repo_id"
              rules={[{ required: true }]}
            >
              <Select options={repos.map(r => ({ label: r.name, value: r.id }))} />
            </Form.Item>
            <Form.Item label="应用名称" name="name" rules={[{ required: true }]}>
              <Input placeholder="例如 nginx (上传后自动填充)" />
            </Form.Item>
            <Form.Item label="描述" name="description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Row gutter={16}>
               <Col span={12}>
                <Form.Item label="图标 URL" name="icon">
                  <Input />
                </Form.Item>
               </Col>
               <Col span={12}>
                <Form.Item label="官网" name="home">
                  <Input />
                </Form.Item>
               </Col>
            </Row>
             <Alert message="提示：大部分信息将在上传 Chart 包后自动填充" type="info" showIcon />
          </Form>
        )
      case 1:
        return (
          <div style={{ textAlign: 'center' }}>
            <Dragger
              maxCount={1}
              accept=".tgz,.tar.gz"
              fileList={fileList}
              beforeUpload={(file) => {
                const uploadFile: UploadFile = {
                  uid: file.uid,
                  name: file.name,
                  status: 'done',
                  originFileObj: file,
                }
                setFileList([uploadFile])
                handleParse(file)
                return false
              }}
              onRemove={() => {
                setFileList([])
                setParsedInfo(null)
              }}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽上传 Chart 包</p>
            </Dragger>
            
            {parsedInfo && (
              <div style={{ marginTop: 24, textAlign: 'left', border: '1px solid #f0f0f0', padding: 16, borderRadius: 4 }}>
                <Descriptions title="解析结果" column={2}>
                   <Descriptions.Item label="应用名">{parsedInfo.Name}</Descriptions.Item>
                   <Descriptions.Item label="版本">{parsedInfo.Version}</Descriptions.Item>
                   <Descriptions.Item label="App版本">{parsedInfo.AppVersion}</Descriptions.Item>
                   <Descriptions.Item label="配置项">{Object.keys(parsedInfo.DefaultValues).length} 个顶级Key</Descriptions.Item>
                </Descriptions>
              </div>
            )}
          </div>
        )
      case 2:
        return (
          <Row gutter={24} style={{ height: 500 }}>
            <Col span={12} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Title level={5}>默认配置 (Values.yaml)</Title>
              <div style={{ flex: 1, border: '1px solid #d9d9d9' }}>
                <Editor
                  defaultLanguage="yaml"
                  value={yamlValue}
                  onChange={v => setYamlValue(v || '')}
                  options={{ minimap: { enabled: false }, fontSize: 12 }}
                />
              </div>
            </Col>
            <Col span={12} style={{ height: '100%', overflow: 'auto' }}>
              <Title level={5}>参数规则设置</Title>
              <Alert message="勾选配置：可见 | 必填 | 固定(只读)" type="info" style={{ marginBottom: 8 }} />
              <div style={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                   <span>Key</span>
                   <span>可见</span>
                   <span>必填</span>
                   <span>固定</span>
                </div>
                {allKeys.map(key => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 8, padding: '4px 0', borderBottom: '1px solid #fafafa' }}>
                    <span title={key} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{key}</span>
                    <Checkbox 
                      checked={visibleKeys.includes(key)} 
                      onChange={e => {
                        const checked = e.target.checked
                        setVisibleKeys(prev => checked ? [...prev, key] : prev.filter(k => k !== key))
                      }}
                    />
                    <Checkbox 
                      checked={requiredKeys.includes(key)}
                      onChange={e => {
                         const checked = e.target.checked
                         setRequiredKeys(prev => checked ? [...prev, key] : prev.filter(k => k !== key))
                      }}
                    />
                    <Checkbox 
                      checked={fixedKeys.includes(key)}
                      onChange={e => {
                         const checked = e.target.checked
                         setFixedKeys(prev => checked ? [...prev, key] : prev.filter(k => k !== key))
                      }}
                    />
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        )
      case 3:
        return (
          <div style={{ padding: 24 }}>
            <Alert
              message="准备就绪"
              description="请确认以下信息，点击提交完成上架。"
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <Descriptions bordered column={1}>
              <Descriptions.Item label="应用名称">{baseInfo.name}</Descriptions.Item>
              <Descriptions.Item label="版本">{parsedInfo?.Version}</Descriptions.Item>
              <Descriptions.Item label="必填项数量">{requiredKeys.length}</Descriptions.Item>
              <Descriptions.Item label="固定项数量">{fixedKeys.length}</Descriptions.Item>
              <Descriptions.Item label="可见项数量">{visibleKeys.length}</Descriptions.Item>
            </Descriptions>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title="应用上架向导"
      width={1000}
      footer={
        <div style={{ marginTop: 24 }}>
          {currentStep > 0 && (
            <Button style={{ margin: '0 8px' }} onClick={prev}>
              上一步
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              下一步
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button type="primary" onClick={next} loading={loading} icon={<RocketOutlined />}>
              提交上架
            </Button>
          )}
        </div>
      }
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />
      <div style={{ minHeight: 300 }}>
        {renderContent()}
      </div>
    </Modal>
  )
}
