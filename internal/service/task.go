package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/your-org/app-market/internal/model"
	"gorm.io/gorm"
)

type TaskService struct {
	db            *gorm.DB
	deployService *DeployService
	taskQueue     chan uint
}

func NewTaskService(db *gorm.DB, ds *DeployService) *TaskService {
	ts := &TaskService{
		db:            db,
		deployService: ds,
		taskQueue:     make(chan uint, 100),
	}
	go ts.StartWorker()
	return ts
}

func (s *TaskService) StartWorker() {
	for taskID := range s.taskQueue {
		s.processTask(taskID)
	}
}

func (s *TaskService) processTask(taskID uint) {
	var task model.Task
	if err := s.db.First(&task, taskID).Error; err != nil {
		log.Printf("Failed to load task %d: %v", taskID, err)
		return
	}

	// Update Status to Running
	task.Status = "running"
	s.db.Save(&task)

	var err error
	if task.Type == "deploy" {
		err = s.handleDeploy(task)
	} else {
		err = fmt.Errorf("unknown task type: %s", task.Type)
	}

	// Update Status based on result
	if err != nil {
		task.Status = "failed"
		task.Result = err.Error()
	} else {
		task.Status = "completed"
		task.Result = "Success"
	}
	s.db.Save(&task)
}

func (s *TaskService) handleDeploy(task model.Task) error {
	// 1. Unmarshal payload to DeployRequest
	// We need to marshal it back to bytes first because JSONMap is map[string]interface{}
	payloadBytes, err := json.Marshal(task.Payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	var req DeployRequest
	if err := json.Unmarshal(payloadBytes, &req); err != nil {
		return fmt.Errorf("failed to unmarshal deploy request: %w", err)
	}

	// 2. Call Deploy Service
	// Create a background context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	_, err = s.deployService.Deploy(ctx, req)
	return err
}

// EnqueueDeploy creates a task and queues it
func (s *TaskService) EnqueueDeploy(userID string, req DeployRequest) (*model.Task, error) {
	// Convert request to map for JSONMap storage
	payloadBytes, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	var payload map[string]interface{}
	json.Unmarshal(payloadBytes, &payload)

	task := &model.Task{
		Type:      "deploy",
		Status:    "pending",
		UserID:    userID,
		Payload:   model.JSONMap(payload),
		CreatedAt: time.Now(),
	}

	if err := s.db.Create(task).Error; err != nil {
		return nil, err
	}

	// Push to queue (non-blocking if full, though unlikely with buffer 100)
	select {
	case s.taskQueue <- task.ID:
	default:
		return nil, fmt.Errorf("task queue is full")
	}

	return task, nil
}

// GetTask retrieves a task
func (s *TaskService) GetTask(id uint) (*model.Task, error) {
	var task model.Task
	err := s.db.First(&task, id).Error
	return &task, err
}
