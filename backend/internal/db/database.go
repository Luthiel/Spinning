package db

import (
	"log"
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"spinning/backend/internal/model"
)

var DB *gorm.DB

func Init(dsn string) error {
	// Ensure the directory for the DB file exists
	dir := filepath.Dir(dsn)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	logMode := logger.Silent
	if os.Getenv("GIN_MODE") != "release" {
		logMode = logger.Warn
	}

	var err error
	DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logMode),
	})
	if err != nil {
		return err
	}

	// Enable WAL mode for better concurrent read performance
	DB.Exec("PRAGMA journal_mode=WAL")
	DB.Exec("PRAGMA foreign_keys=ON")

	// Auto-migrate all models
	if err := DB.AutoMigrate(
		&model.Skill{},
		&model.SkillFileVersion{},
		&model.SkillEmbedding{},
		&model.RouterConfig{},
		&model.Flow{},
		&model.FlowNode{},
		&model.FlowEdge{},
		&model.FlowTemplate{},
		&model.FlowExecution{},
	); err != nil {
		return err
	}

	log.Println("[DB] SQLite initialized:", dsn)
	return nil
}
