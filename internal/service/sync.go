package service

import (
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/your-org/app-market/internal/model"
	"gorm.io/gorm"
	"helm.sh/helm/v3/pkg/repo"
	"sigs.k8s.io/yaml"
)

type SyncService struct {
	db *gorm.DB
}

func NewSyncService(db *gorm.DB) *SyncService {
	return &SyncService{db: db}
}

// AddRepo adds a new repository to sync
func (s *SyncService) AddRepo(name, url string) error {
	repo := &model.ChartRepo{
		Name: name,
		URL:  url,
	}
	return s.db.Create(repo).Error
}

// SyncRepo fetches the index.yaml and updates the local chart cache
func (s *SyncService) SyncRepo(repoID uint) error {
	var chartRepo model.ChartRepo
	if err := s.db.First(&chartRepo, repoID).Error; err != nil {
		return fmt.Errorf("repo not found: %w", err)
	}

	// 1. Download index.yaml
	indexURL := fmt.Sprintf("%s/index.yaml", chartRepo.URL)
	resp, err := http.Get(indexURL)
	if err != nil {
		return fmt.Errorf("failed to fetch index: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch index: status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read index: %w", err)
	}

	// 2. Parse index.yaml
	var indexFile repo.IndexFile
	if err := yaml.Unmarshal(data, &indexFile); err != nil {
		return fmt.Errorf("failed to parse index: %w", err)
	}

	// 3. Update Database (Transaction)
	return s.db.Transaction(func(tx *gorm.DB) error {
		for name, versions := range indexFile.Entries {
			// Find or Create Chart
			var chart model.Chart
			if err := tx.Where("repo_id = ? AND name = ?", chartRepo.ID, name).FirstOrCreate(&chart, model.Chart{
				RepoID:      chartRepo.ID,
				Name:        name,
				Description: versions[0].Description,
				Icon:        versions[0].Icon,
				Home:        versions[0].Home,
			}).Error; err != nil {
				return err
			}

			// Add Versions
			for _, v := range versions {
				var existingVersion model.ChartVersion
				if err := tx.Where("chart_id = ? AND version = ?", chart.ID, v.Version).First(&existingVersion).Error; err == nil {
					continue // Already exists
				}

				newVersion := model.ChartVersion{
					ChartID:    chart.ID,
					Version:    v.Version,
					AppVersion: v.AppVersion,
					Digest:     v.Digest,
					URLs:       model.StringArray(v.URLs),
					CreatedAt:  v.Created,
				}
				if err := tx.Create(&newVersion).Error; err != nil {
					return err
				}
			}
		}

		// Update Repo Timestamp
		return tx.Model(&chartRepo).Update("updated_at", time.Now()).Error
	})
}

// ListRepos returns all configured repositories
func (s *SyncService) ListRepos() ([]model.ChartRepo, error) {
	var repos []model.ChartRepo
	err := s.db.Find(&repos).Error
	return repos, err
}
