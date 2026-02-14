package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/your-org/app-market/internal/helm"
	"github.com/your-org/app-market/internal/model"
	"github.com/your-org/app-market/internal/service"
)

type ChartHandler struct {
	service *service.ChartService
}

func NewChartHandler(s *service.ChartService) *ChartHandler {
	return &ChartHandler{service: s}
}

type UpdateConfigRequest struct {
	DefaultValues map[string]interface{} `json:"default_values"`
	RequiredKeys  []string               `json:"required_keys"`
	VisibleKeys   []string               `json:"visible_keys"`
	FixedKeys     []string               `json:"fixed_keys"`
	Description   string                 `json:"description"`
}

// UpdateConfig updates the admin configuration for a chart
// POST /admin/charts/:id/versions/:version/config
func (h *ChartHandler) UpdateConfig(c *gin.Context) {
	chartID := c.Param("id")
	version := c.Param("version")

	var req UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	meta := &model.ChartMetadata{
		ChartID:       chartID,
		Version:       version,
		DefaultValues: model.JSONMap(req.DefaultValues),
		RequiredKeys:  model.StringArray(req.RequiredKeys),
		VisibleKeys:   model.StringArray(req.VisibleKeys),
		FixedKeys:     model.StringArray(req.FixedKeys),
		Description:   req.Description,
	}

	if err := h.service.SaveMetadata(meta); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// GetConfig retrieves the admin configuration for a chart
// GET /admin/charts/:id/versions/:version/config
func (h *ChartHandler) GetConfig(c *gin.Context) {
	chartID := c.Param("id")
	version := c.Param("version")

	meta, err := h.service.GetMetadata(chartID, version)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get configuration"})
		return
	}

	c.JSON(http.StatusOK, meta)
}

type PublishChartRequest struct {
	Published bool `json:"published"`
}

type CreateChartRequest struct {
	RepoID      uint   `json:"repo_id" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Home        string `json:"home"`
	Published   bool   `json:"published"`
}

type CreateChartVersionRequest struct {
	Version    string   `json:"version" binding:"required"`
	AppVersion string   `json:"app_version"`
	Digest     string   `json:"digest"`
	URLs       []string `json:"urls"`
}

func (h *ChartHandler) ListCharts(c *gin.Context) {
	charts, err := h.service.ListCharts(false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list charts"})
		return
	}
	c.JSON(http.StatusOK, charts)
}

func (h *ChartHandler) ListPublishedCharts(c *gin.Context) {
	charts, err := h.service.ListCharts(true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list charts"})
		return
	}
	c.JSON(http.StatusOK, charts)
}

func (h *ChartHandler) UpdatePublishStatus(c *gin.Context) {
	chartID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chart id"})
		return
	}

	var req PublishChartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdatePublishStatus(uint(chartID), req.Published); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update publish status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *ChartHandler) CreateChart(c *gin.Context) {
	var req CreateChartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	chart := &model.Chart{
		RepoID:      req.RepoID,
		Name:        req.Name,
		Description: req.Description,
		Icon:        req.Icon,
		Home:        req.Home,
		Published:   req.Published,
	}

	if err := h.service.CreateChart(chart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chart"})
		return
	}

	c.JSON(http.StatusCreated, chart)
}

func (h *ChartHandler) CreateChartVersion(c *gin.Context) {
	chartID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chart id"})
		return
	}

	var req CreateChartVersionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	version := &model.ChartVersion{
		ChartID:    uint(chartID),
		Version:    req.Version,
		AppVersion: req.AppVersion,
		Digest:     req.Digest,
		URLs:       model.StringArray(req.URLs),
	}

	if err := h.service.CreateChartVersion(version); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chart version"})
		return
	}

	c.JSON(http.StatusCreated, version)
}

// UploadChart handles chart package upload
// POST /admin/charts/upload
func (h *ChartHandler) UploadChart(c *gin.Context) {
	// 1. Get file from request
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// 2. Save to temp location for parsing
	tempDir := os.TempDir()
	tempPath := filepath.Join(tempDir, file.Filename)
	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save temp file"})
		return
	}
	defer os.Remove(tempPath)

	// 3. Parse Chart
	chartInfo, err := helm.ParseChartArchive(tempPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chart package: " + err.Error()})
		return
	}

	// 4. Ensure "Local" repo exists (we need a repo to attach the chart to)
	// For now, we'll assume a repo with ID 1 or find one named "local",
	// but better practice is to have a dedicated service method for this.
	// Since we are in handler, we should probably let service handle the "Default Repo" logic or expose it.
	// For simplicity, let's ask the user to select a repo ID from the frontend or default to the first one found in DB?
	// The user requirement says "system automatically checks and creates a local warehouse record".
	// So we should do this in the service or here.
	// Let's rely on a helper method in service to get/create the local repo.

	repoID, err := h.service.GetOrCreateLocalRepo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get local repository: " + err.Error()})
		return
	}

	// 5. Move file to permanent storage
	// Ensure uploads directory exists
	uploadDir := "uploads/charts"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Naming convention: name-version.tgz
	targetFilename := fmt.Sprintf("%s-%s.tgz", chartInfo.Name, chartInfo.Version)
	targetPath := filepath.Join(uploadDir, targetFilename)

	// Copy from temp to target (since os.Rename might fail across devices)
	if err := copyFile(tempPath, targetPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chart file"})
		return
	}

	// 6. Create Chart in DB
	req := service.UploadChartRequest{
		RepoID:        repoID,
		Name:          chartInfo.Name,
		Description:   chartInfo.Description,
		Icon:          chartInfo.Icon,
		Home:          chartInfo.Home,
		Version:       chartInfo.Version,
		AppVersion:    chartInfo.AppVersion,
		LocalPath:     targetPath, // Store absolute or relative path? Relative is better for portability.
		DefaultValues: chartInfo.DefaultValues,
		Published:     true, // Auto publish uploaded charts? Or let user decide? Let's default to true for convenience.
	}

	chart, version, err := h.service.CreateChartFromUpload(req)
	if err != nil {
		// Clean up file if DB fails
		os.Remove(targetPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chart metadata: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Chart uploaded successfully",
		"chart":   chart,
		"version": version,
	})
}

// ParseChart parses a chart package without saving it
// POST /admin/charts/parse
func (h *ChartHandler) ParseChart(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	tempDir := os.TempDir()
	tempPath := filepath.Join(tempDir, file.Filename)
	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save temp file"})
		return
	}
	defer os.Remove(tempPath)

	chartInfo, err := helm.ParseChartArchive(tempPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chart package: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, chartInfo)
}

// OnboardChart handles the full chart onboarding process
// POST /admin/charts/onboard
func (h *ChartHandler) OnboardChart(c *gin.Context) {
	// 1. Get file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// 2. Get Metadata JSON
	metadataStr := c.PostForm("metadata")
	if metadataStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No metadata provided"})
		return
	}

	// Define a struct for the incoming metadata
	type OnboardMetadata struct {
		RepoID      uint   `json:"repo_id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Icon        string `json:"icon"`
		Home        string `json:"home"`
		Published   bool   `json:"published"`

		// Admin Config
		DefaultValues map[string]interface{} `json:"default_values"` // Admin overrides
		RequiredKeys  []string               `json:"required_keys"`
		VisibleKeys   []string               `json:"visible_keys"`
		FixedKeys     []string               `json:"fixed_keys"`
	}

	var meta OnboardMetadata
	if err := json.Unmarshal([]byte(metadataStr), &meta); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid metadata JSON: " + err.Error()})
		return
	}

	// 3. Save file permanently
	tempDir := os.TempDir()
	tempPath := filepath.Join(tempDir, file.Filename)
	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save temp file"})
		return
	}
	defer os.Remove(tempPath)

	chartInfo, err := helm.ParseChartArchive(tempPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chart package: " + err.Error()})
		return
	}

	uploadDir := "uploads/charts"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	targetFilename := fmt.Sprintf("%s-%s.tgz", chartInfo.Name, chartInfo.Version)
	targetPath := filepath.Join(uploadDir, targetFilename)

	if err := copyFile(tempPath, targetPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chart file"})
		return
	}

	// 4. Create Chart & Version
	req := service.UploadChartRequest{
		RepoID:        meta.RepoID,
		Name:          meta.Name,
		Description:   meta.Description,
		Icon:          meta.Icon,
		Home:          meta.Home,
		Version:       chartInfo.Version,
		AppVersion:    chartInfo.AppVersion,
		LocalPath:     targetPath,
		DefaultValues: chartInfo.DefaultValues, // Raw defaults from chart
		Published:     meta.Published,
	}

	chart, version, err := h.service.CreateChartFromUpload(req)
	if err != nil {
		os.Remove(targetPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chart: " + err.Error()})
		return
	}

	// 5. Save Admin Metadata
	chartMeta := &model.ChartMetadata{
		ChartID:       fmt.Sprintf("%d", chart.ID),
		Version:       version.Version,
		Description:   meta.Description,
		DefaultValues: model.JSONMap(meta.DefaultValues),
		RequiredKeys:  model.StringArray(meta.RequiredKeys),
		VisibleKeys:   model.StringArray(meta.VisibleKeys),
		FixedKeys:     model.StringArray(meta.FixedKeys),
	}

	if err := h.service.SaveMetadata(chartMeta); err != nil {
		c.JSON(http.StatusCreated, gin.H{
			"message": "Chart created but metadata failed",
			"chart":   chart,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Chart onboarded successfully",
		"chart":   chart,
	})
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// DeleteChart godoc
// @Summary      Delete Chart
// @Description  Delete an unpublished chart
// @Tags         admin
// @Produce      json
// @Param        id   path      int  true  "Chart ID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /admin/charts/{id} [delete]
func (h *ChartHandler) DeleteChart(c *gin.Context) {
	chartID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chart id"})
		return
	}

	err = h.service.DeleteChart(uint(chartID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chart deleted successfully"})
}
