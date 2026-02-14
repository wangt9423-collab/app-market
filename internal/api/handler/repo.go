package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/your-org/app-market/internal/model"
	"github.com/your-org/app-market/internal/service"
)

type RepoHandler struct {
	service *service.SyncService
}

func NewRepoHandler(s *service.SyncService) *RepoHandler {
	return &RepoHandler{service: s}
}

type AddRepoRequest struct {
	Name string `json:"name" binding:"required" example:"bitnami"`
	URL  string `json:"url" binding:"required" example:"https://charts.bitnami.com/bitnami"`
}

// AddRepo godoc
// @Summary      Add Chart Repository
// @Description  Register a new Helm chart repository
// @Tags         repo
// @Accept       json
// @Produce      json
// @Param        request body AddRepoRequest true "Repo Details"
// @Success      201  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /admin/repos [post]
func (h *RepoHandler) AddRepo(c *gin.Context) {
	var req AddRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.AddRepo(req.Name, req.URL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add repo"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "created"})
}

// ListRepos godoc
// @Summary      List Repositories
// @Description  Get all registered chart repositories
// @Tags         repo
// @Produce      json
// @Success      200  {array}   model.ChartRepo
// @Failure      500  {object}  map[string]string
// @Router       /admin/repos [get]
func (h *RepoHandler) ListRepos(c *gin.Context) {
	repos, err := h.service.ListRepos()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list repos"})
		return
	}
	// Verify usage
	var _ []model.ChartRepo = repos

	c.JSON(http.StatusOK, repos)
}

// SyncRepo godoc
// @Summary      Sync Repository
// @Description  Trigger index.yaml synchronization for a repo
// @Tags         repo
// @Produce      json
// @Param        id   path      int  true  "Repo ID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /admin/repos/{id}/sync [post]
func (h *RepoHandler) SyncRepo(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.service.SyncRepo(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "synced"})
}
