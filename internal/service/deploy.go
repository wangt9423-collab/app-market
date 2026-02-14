package service

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/your-org/app-market/internal/helm"
	"github.com/your-org/app-market/internal/model"
	"gorm.io/gorm"
)

type DeployService struct {
	db           *gorm.DB
	chartService *ChartService
}

func NewDeployService(db *gorm.DB, chartService *ChartService) *DeployService {
	return &DeployService{
		db:           db,
		chartService: chartService,
	}
}

type DeployRequest struct {
	UserID      string                 `json:"user_id"`
	ChartID     string                 `json:"chart_id"`
	Version     string                 `json:"version"`
	ReleaseName string                 `json:"release_name"`
	Namespace   string                 `json:"namespace"`
	UserValues  map[string]interface{} `json:"user_values"`
	IsQuickMode bool                   `json:"is_quick_mode"` // If true, strictly enforce admin defaults
}

// Deploy orchestrates the deployment process
func (s *DeployService) Deploy(ctx context.Context, req DeployRequest) (*model.AppInstance, error) {
	// 1. 获取 ChartVersion (包含原始 values)
	var chartVersion model.ChartVersion
	err := s.db.Where("chart_id = ? AND version = ?", req.ChartID, req.Version).
		Preload("Chart").
		First(&chartVersion).Error
	if err != nil {
		return nil, fmt.Errorf("chart version not found: %w", err)
	}

	// 2. 获取 Admin 配置
	meta, err := s.chartService.GetMetadata(req.ChartID, req.Version)
	if err != nil {
		return nil, fmt.Errorf("failed to get chart metadata: %w", err)
	}

	// 3. 验证必填字段
	if len(meta.RequiredKeys) > 0 {
		if err := helm.ValidateRequiredKeys(req.UserValues, meta.RequiredKeys); err != nil {
			return nil, fmt.Errorf("validation failed: %w", err)
		}
	}

	// 4. 三层合并 (修复 TODO)
	chartDefaults := map[string]interface{}(chartVersion.ChartDefaultValues) // 从数据库读取
	if chartDefaults == nil {
		chartDefaults = make(map[string]interface{}) // 兼容旧数据
	}

	finalValues, err := helm.MergeValues(chartDefaults, meta.DefaultValues, req.UserValues)
	if err != nil {
		return nil, fmt.Errorf("failed to merge values: %w", err)
	}

	// 5. 确定 Chart 路径 (优先本地,兼容远程)
	chartPath := chartVersion.LocalPath
	if chartPath == "" && len(chartVersion.URLs) > 0 {
		// 从远程下载 (保持兼容现有同步流程)
		chartPath, err = s.downloadChart(ctx, chartVersion.URLs[0])
		if err != nil {
			return nil, fmt.Errorf("failed to download chart: %w", err)
		}
		defer os.Remove(chartPath) // 清理临时文件
	}

	if chartPath == "" {
		return nil, fmt.Errorf("no chart source available (neither LocalPath nor URLs)")
	}

	// 6. Helm 部署
	helmClient, err := helm.NewClient(req.Namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to create helm client: %w", err)
	}

	if err := helmClient.InstallChart(ctx, req.ReleaseName, chartPath, finalValues); err != nil {
		return nil, fmt.Errorf("helm deployment failed: %w", err)
	}

	// 7. 保存实例记录
	instance := &model.AppInstance{
		Name:          req.ReleaseName,
		Namespace:     req.Namespace,
		UserID:        req.UserID,
		ChartID:       req.ChartID,
		ChartVersion:  req.Version,
		Status:        "deployed",
		AppliedValues: model.JSONMap(finalValues),
	}

	if err := s.db.Create(instance).Error; err != nil {
		return nil, fmt.Errorf("failed to save instance record: %w", err)
	}

	return instance, nil
}

// downloadChart 下载远程 Chart
func (s *DeployService) downloadChart(ctx context.Context, url string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	tempFile, err := os.CreateTemp("", "chart-*.tgz")
	if err != nil {
		return "", err
	}

	_, err = io.Copy(tempFile, resp.Body)
	tempFile.Close()
	if err != nil {
		os.Remove(tempFile.Name())
		return "", err
	}

	return tempFile.Name(), nil
}

// ListInstances retrieves all instances for a user
func (s *DeployService) ListInstances(userID string) ([]model.AppInstance, error) {
	var instances []model.AppInstance
	if err := s.db.Where("user_id = ?", userID).Find(&instances).Error; err != nil {
		return nil, err
	}
	return instances, nil
}

// DeleteInstance deletes an instance by ID and userID
func (s *DeployService) DeleteInstance(instanceID, userID string) error {
	var instance model.AppInstance
	if err := s.db.Where("id = ? AND user_id = ?", instanceID, userID).First(&instance).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("instance not found")
		}
		return fmt.Errorf("failed to find instance: %w", err)
	}

	// Delete from Kubernetes
	helmClient, err := helm.NewClient(instance.Namespace)
	if err != nil {
		return fmt.Errorf("failed to create helm client: %w", err)
	}

	if err := helmClient.UninstallRelease(instance.Name); err != nil {
		return fmt.Errorf("failed to uninstall helm release: %w", err)
	}

	// Delete from database
	if err := s.db.Delete(&instance).Error; err != nil {
		return fmt.Errorf("failed to delete instance from database: %w", err)
	}

	return nil
}
