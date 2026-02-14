package helm

import (
	"fmt"

	"helm.sh/helm/v3/pkg/chart/loader"
)

// ChartInfo Chart 解析结果
type ChartInfo struct {
	Name          string
	Version       string
	AppVersion    string
	Description   string
	Icon          string
	Home          string
	DefaultValues map[string]interface{} // 从 values.yaml 解析
}

// ParseChartArchive 解析 .tgz 文件
func ParseChartArchive(tgzPath string) (*ChartInfo, error) {
	// 1. 使用 Helm SDK 加载
	chart, err := loader.Load(tgzPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load chart: %w", err)
	}

	// 2. 提取元数据和 values
	return &ChartInfo{
		Name:          chart.Metadata.Name,
		Version:       chart.Metadata.Version,
		AppVersion:    chart.Metadata.AppVersion,
		Description:   chart.Metadata.Description,
		Icon:          chart.Metadata.Icon,
		Home:          chart.Metadata.Home,
		DefaultValues: chart.Values, // Helm SDK 已解析为 map
	}, nil
}

// FlattenValues 扁平化嵌套 map (用于前端展示)
func FlattenValues(values map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	flattenRecursive(values, "", result)
	return result
}

func flattenRecursive(values map[string]interface{}, prefix string, result map[string]interface{}) {
	for k, v := range values {
		key := k
		if prefix != "" {
			key = prefix + "." + k
		}

		if nested, ok := v.(map[string]interface{}); ok {
			flattenRecursive(nested, key, result)
		} else {
			result[key] = v
		}
	}
}
