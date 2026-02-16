package service

import (
	"errors"
	"fmt"

	"github.com/your-org/app-market/internal/model"
	"gorm.io/gorm"
)

type ChartService struct {
	db *gorm.DB
}

func NewChartService(db *gorm.DB) *ChartService {
	return &ChartService{db: db}
}

// SaveMetadata creates or updates chart configuration
func (s *ChartService) SaveMetadata(meta *model.ChartMetadata) error {
	// Check if exists to update or create
	var existing model.ChartMetadata
	err := s.db.Where("chart_id = ? AND version = ?", meta.ChartID, meta.Version).First(&existing).Error

	if err == nil {
		// Update
		meta.ID = existing.ID
		return s.db.Save(meta).Error
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create
		return s.db.Create(meta).Error
	}

	return err
}

// GetMetadata retrieves configuration for a specific chart version
func (s *ChartService) GetMetadata(chartID, version string) (*model.ChartMetadata, error) {
	var meta model.ChartMetadata
	err := s.db.Where("chart_id = ? AND version = ?", chartID, version).First(&meta).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &model.ChartMetadata{
				ChartID:       chartID,
				Version:       version,
				DefaultValues: make(model.JSONMap),
				RequiredKeys:  make(model.StringArray, 0),
				VisibleKeys:   make(model.StringArray, 0),
			}, nil
		}
		return nil, err
	}
	return &meta, nil
}

func (s *ChartService) ListCharts(onlyPublished bool) ([]model.Chart, error) {
	var charts []model.Chart
	query := s.db.Preload("Versions")
	if onlyPublished {
		query = query.Where("published = ?", true)
	}
	if err := query.Find(&charts).Error; err != nil {
		return nil, err
	}
	return charts, nil
}

func (s *ChartService) UpdatePublishStatus(chartID uint, published bool) error {
	return s.db.Model(&model.Chart{}).Where("id = ?", chartID).Update("published", published).Error
}

func (s *ChartService) CreateChart(chart *model.Chart) error {
	return s.db.Create(chart).Error
}

func (s *ChartService) CreateChartVersion(version *model.ChartVersion) error {
	return s.db.Create(version).Error
}

// UploadChartRequest 上传 Chart 的请求参数
type UploadChartRequest struct {
	RepoID        uint
	Name          string
	Description   string
	Icon          string
	Home          string
	Version       string
	AppVersion    string
	LocalPath     string
	DefaultValues map[string]interface{}
	Published     bool
}

// CreateChartFromUpload 从上传的 Chart 创建记录
func (s *ChartService) CreateChartFromUpload(req UploadChartRequest) (*model.Chart, *model.ChartVersion, error) {
	var chart model.Chart
	var version *model.ChartVersion

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. 查找或创建 Chart
		result := tx.Where("repo_id = ? AND name = ?", req.RepoID, req.Name).
			FirstOrCreate(&chart, model.Chart{
				RepoID:      req.RepoID,
				Name:        req.Name,
				Description: req.Description,
				Icon:        req.Icon,
				Home:        req.Home,
				Published:   req.Published,
			})
		if result.Error != nil {
			return result.Error
		}

		// 2. 检查版本是否已存在
		var existing model.ChartVersion
		if tx.Where("chart_id = ? AND version = ?", chart.ID, req.Version).First(&existing).Error == nil {
			return fmt.Errorf("版本 %s 已存在", req.Version)
		}

		// 3. 创建 ChartVersion
		version = &model.ChartVersion{
			ChartID:            chart.ID,
			Version:            req.Version,
			AppVersion:         req.AppVersion,
			LocalPath:          req.LocalPath,
			ChartDefaultValues: model.JSONMap(req.DefaultValues), // 存储原始 values
			URLs:               model.StringArray{},
		}

		return tx.Create(version).Error
	})

	return &chart, version, err
}

// GetOrCreateLocalRepo ensures a "Local" repository exists and returns its ID
func (s *ChartService) GetOrCreateLocalRepo() (uint, error) {
	var repo model.ChartRepo
	// Try to find a repo named "Local"
	err := s.db.Where("name = ?", "Local").First(&repo).Error
	if err == nil {
		return repo.ID, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}

	// Create if not exists
	repo = model.ChartRepo{
		Name: "Local",
		URL:  "http://localhost/charts", // Dummy URL for local repo
	}

	if err := s.db.Create(&repo).Error; err != nil {
		return 0, err
	}

	return repo.ID, nil
}

// DeleteChart deletes a chart by ID (only allowed if chart is not published)
func (s *ChartService) DeleteChart(chartID uint) error {
	var chart model.Chart
	if err := s.db.First(&chart, chartID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("chart not found")
		}
		return fmt.Errorf("failed to find chart: %w", err)
	}

	// Check if chart is published
	if chart.Published {
		return fmt.Errorf("cannot delete published chart, please unpublish first")
	}

	// Delete chart versions first
	if err := s.db.Where("chart_id = ?", chartID).Delete(&model.ChartVersion{}).Error; err != nil {
		return fmt.Errorf("failed to delete chart versions: %w", err)
	}

	// Delete chart metadata
	if err := s.db.Where("chart_id = ?", fmt.Sprintf("%d", chartID)).Delete(&model.ChartMetadata{}).Error; err != nil {
		return fmt.Errorf("failed to delete chart metadata: %w", err)
	}

	// Delete the chart itself
	if err := s.db.Delete(&chart).Error; err != nil {
		return fmt.Errorf("failed to delete chart: %w", err)
	}

	return nil
}

// UpdateChart updates chart basic information
func (s *ChartService) UpdateChart(chartID uint, updates map[string]interface{}) error {
	return s.db.Model(&model.Chart{}).Where("id = ?", chartID).Updates(updates).Error
}
