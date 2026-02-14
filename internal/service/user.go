package service

import (
	"errors"
	"fmt"

	"github.com/your-org/app-market/internal/model"
	"github.com/your-org/app-market/internal/repository"
	"gorm.io/gorm"
)

type UserService struct {
	repo *repository.UserRepository
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{
		repo: repository.NewUserRepository(db),
	}
}

type CreateUserInput struct {
	Username string
	Password string
	Email    string
	Role     string
	Status   string
}

type UpdateUserInput struct {
	Email    string
	Role     string
	Status   string
}

type UserListOutput struct {
	Users []model.User
	Total int64
}

// CreateUser creates a new user
func (s *UserService) CreateUser(input CreateUserInput) (*model.User, error) {
	// Check if username already exists
	existingUser, err := s.repo.GetByUsername(input.Username)
	if err == nil && existingUser != nil {
		return nil, errors.New("username already exists")
	}

	// Check if email already exists (if provided)
	if input.Email != "" {
		existingUser, err := s.repo.GetByEmail(input.Email)
		if err == nil && existingUser != nil {
			return nil, errors.New("email already exists")
		}
	}

	// Validate role
	if input.Role != "admin" && input.Role != "user" {
		input.Role = "user"
	}

	// Validate status
	status := "active"
	if input.Status != "" {
		status = input.Status
	}

	user := &model.User{
		Username: input.Username,
		Password: input.Password,
		Email:    input.Email,
		Role:     input.Role,
		Status:   status,
	}

	if err := user.HashPassword(); err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	if err := s.repo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetUserByID returns a user by ID
func (s *UserService) GetUserByID(id uint) (*model.User, error) {
	user, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

// GetUsers returns a list of users with pagination
func (s *UserService) GetUsers(page, pageSize int) (*UserListOutput, error) {
	offset := (page - 1) * pageSize
	users, total, err := s.repo.List(offset, pageSize)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	return &UserListOutput{
		Users: users,
		Total: total,
	}, nil
}

// UpdateUser updates a user's information
func (s *UserService) UpdateUser(id uint, input UpdateUserInput) (*model.User, error) {
	user, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if input.Email != "" {
		// Check if email is already used by another user
		existingUser, err := s.repo.GetByEmail(input.Email)
		if err == nil && existingUser != nil && existingUser.ID != id {
			return nil, errors.New("email already exists")
		}
		user.Email = input.Email
	}

	if input.Role != "" {
		if input.Role != "admin" && input.Role != "user" {
			return nil, errors.New("invalid role")
		}
		user.Role = input.Role
	}

	if input.Status != "" {
		if input.Status != "active" && input.Status != "inactive" {
			return nil, errors.New("invalid status")
		}
		user.Status = input.Status
	}

	if err := s.repo.Update(user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

// DeleteUser deletes a user
func (s *UserService) DeleteUser(id uint) error {
	_, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return fmt.Errorf("failed to get user: %w", err)
	}

	if err := s.repo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

// ResetPassword resets a user's password
func (s *UserService) ResetPassword(id uint, newPassword string) error {
	user, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return fmt.Errorf("failed to get user: %w", err)
	}

	user.Password = newPassword
	if err := user.HashPassword(); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	if err := s.repo.Update(user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	return nil
}
