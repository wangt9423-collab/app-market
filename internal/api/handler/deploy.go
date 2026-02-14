package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/your-org/app-market/internal/model"
	"github.com/your-org/app-market/internal/service"
)

type DeployHandler struct {
	service     *service.DeployService
	taskService *service.TaskService
}

func NewDeployHandler(s *service.DeployService, ts *service.TaskService) *DeployHandler {
	return &DeployHandler{
		service:     s,
		taskService: ts,
	}
}

type DeployRequest struct {
	ChartID     string                 `json:"chart_id" binding:"required" example:"nginx"`
	Version     string                 `json:"version" binding:"required" example:"1.0.0"`
	ReleaseName string                 `json:"release_name" binding:"required" example:"my-nginx"`
	Namespace   string                 `json:"namespace" binding:"required" example:"default"`
	UserValues  map[string]interface{} `json:"user_values"`
	IsQuickMode bool                   `json:"is_quick_mode" example:"true"`
}

type TaskResponse struct {
	Message string `json:"message"`
	TaskID  uint   `json:"task_id"`
	Status  string `json:"status"`
}

// Deploy godoc
// @Summary      Deploy Application
// @Description  Queues a deployment task for a specific chart
// @Tags         deploy
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body DeployRequest true "Deployment Parameters"
// @Success      202  {object}  TaskResponse
// @Failure      400  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /api/deploy [post]
func (h *DeployHandler) Deploy(c *gin.Context) {
	userID := c.MustGet("userID").(string)

	var req DeployRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svcReq := service.DeployRequest{
		UserID:      userID,
		ChartID:     req.ChartID,
		Version:     req.Version,
		ReleaseName: req.ReleaseName,
		Namespace:   req.Namespace,
		UserValues:  req.UserValues,
		IsQuickMode: req.IsQuickMode,
	}

	// Enqueue Task
	task, err := h.taskService.EnqueueDeploy(userID, svcReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue deployment: " + err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, TaskResponse{
		Message: "Deployment queued",
		TaskID:  task.ID,
		Status:  task.Status,
	})
}

// ListInstances godoc
// @Summary      List Instances
// @Description  Get all deployed instances for the current user
// @Tags         deploy
// @Produce      json
// @Security     BearerAuth
// @Success      200  {array}   model.AppInstance
// @Failure      500  {object}  map[string]string
// @Router       /api/instances [get]
func (h *DeployHandler) ListInstances(c *gin.Context) {
	// ... implementation
	userID := c.MustGet("userID").(string)

	instances, err := h.service.ListInstances(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list instances"})
		return
	}

	// Make sure model is used in code, or just alias it for docs
	// Actually, h.service.ListInstances returns []model.AppInstance, so the import IS used indirectly via type inference?
	// No, Go compiler is strict. The handler code doesn't explicitly name model.AppInstance.

	c.JSON(http.StatusOK, instances)
}

// GetTaskStatus godoc
// @Summary      Get Task Status
// @Description  Check the status of an asynchronous task
// @Tags         deploy
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Task ID"
// @Success      200  {object}  model.Task
// @Failure      404  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Router       /api/tasks/{id} [get]
func (h *DeployHandler) GetTaskStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	task, err := h.taskService.GetTask(uint(id))
	// Force usage of model package if compiler complains (though task is *model.Task)
	var _ *model.Task = task
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Check if user owns the task
	userID := c.MustGet("userID").(string)
	if task.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	c.JSON(http.StatusOK, task)
}

// DeleteInstance godoc
// @Summary      Delete Instance
// @Description  Delete a deployed instance from Kubernetes and database
// @Tags         deploy
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Instance ID"
// @Success      200  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Router       /api/instances/{id} [delete]
func (h *DeployHandler) DeleteInstance(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	userID := c.MustGet("userID").(string)

	err = h.service.DeleteInstance(fmt.Sprintf("%d", id), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Instance deleted successfully"})
}
